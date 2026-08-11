-- Pending OAuth states are short-lived and cannot be associated safely after rollout.
DELETE FROM "instagram_oauth_state";

CREATE TABLE "meta_app_config" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "requestedScopes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_app_config_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "instagram_connected_account"
    ADD COLUMN "integrationSource" TEXT NOT NULL DEFAULT 'legacy_project_app',
    ADD COLUMN "metaAppConfigId" TEXT;

ALTER TABLE "instagram_oauth_state"
    ADD COLUMN "metaAppConfigId" TEXT NOT NULL;

CREATE UNIQUE INDEX "meta_app_config_publicId_key"
    ON "meta_app_config"("publicId");

CREATE UNIQUE INDEX "meta_app_config_appId_key"
    ON "meta_app_config"("appId");

CREATE INDEX "meta_app_config_userId_isActive_idx"
    ON "meta_app_config"("userId", "isActive");

-- Prisma cannot represent partial indexes; this closes concurrent activation races.
CREATE UNIQUE INDEX "meta_app_config_one_active_per_user"
    ON "meta_app_config"("userId")
    WHERE "isActive" = true;

CREATE INDEX "instagram_connected_account_metaAppConfigId_idx"
    ON "instagram_connected_account"("metaAppConfigId");

CREATE INDEX "instagram_oauth_state_metaAppConfigId_idx"
    ON "instagram_oauth_state"("metaAppConfigId");

ALTER TABLE "meta_app_config"
    ADD CONSTRAINT "meta_app_config_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "instagram_connected_account"
    ADD CONSTRAINT "instagram_connected_account_metaAppConfigId_fkey"
    FOREIGN KEY ("metaAppConfigId") REFERENCES "meta_app_config"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instagram_oauth_state"
    ADD CONSTRAINT "instagram_oauth_state_metaAppConfigId_fkey"
    FOREIGN KEY ("metaAppConfigId") REFERENCES "meta_app_config"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

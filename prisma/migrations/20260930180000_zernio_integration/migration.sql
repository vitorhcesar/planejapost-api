-- Zernio integration: replace Instagram/Meta models with social + Zernio fields

-- Drop legacy Instagram/Meta tables (project not in production)
DROP TABLE IF EXISTS "publication_target" CASCADE;
DROP TABLE IF EXISTS "publication" CASCADE;
DROP TABLE IF EXISTS "account_slot" CASCADE;
DROP TABLE IF EXISTS "instagram_oauth_state" CASCADE;
DROP TABLE IF EXISTS "instagram_connected_account" CASCADE;
DROP TABLE IF EXISTS "meta_app_config" CASCADE;

-- User: Zernio profile
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "zernioProfileId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "user_zernioProfileId_key" ON "user"("zernioProfileId");

-- Social connected accounts
CREATE TABLE "social_connected_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "zernioAccountId" TEXT NOT NULL,
    "zernioProfileId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "canPost" BOOLEAN NOT NULL DEFAULT true,
    "needsReconnect" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_connected_account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_connected_account_userId_zernioAccountId_key" ON "social_connected_account"("userId", "zernioAccountId");
CREATE INDEX "social_connected_account_userId_idx" ON "social_connected_account"("userId");
CREATE INDEX "social_connected_account_userId_platform_status_idx" ON "social_connected_account"("userId", "platform", "status");
CREATE INDEX "social_connected_account_zernioAccountId_idx" ON "social_connected_account"("zernioAccountId");

ALTER TABLE "social_connected_account" ADD CONSTRAINT "social_connected_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Social connect sessions
CREATE TABLE "social_connect_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountSlotId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "zernioProfileId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "state" TEXT NOT NULL,
    "tempToken" TEXT,
    "connectToken" TEXT,
    "step" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_connect_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_connect_session_state_key" ON "social_connect_session"("state");
CREATE INDEX "social_connect_session_userId_idx" ON "social_connect_session"("userId");
CREATE INDEX "social_connect_session_expiresAt_idx" ON "social_connect_session"("expiresAt");

ALTER TABLE "social_connect_session" ADD CONSTRAINT "social_connect_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Account slots (social FK)
CREATE TABLE "account_slot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "socialConnectedAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_slot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_slot_socialConnectedAccountId_key" ON "account_slot"("socialConnectedAccountId");
CREATE INDEX "account_slot_userId_idx" ON "account_slot"("userId");
CREATE INDEX "account_slot_status_idx" ON "account_slot"("status");
CREATE INDEX "account_slot_expiresAt_idx" ON "account_slot"("expiresAt");

ALTER TABLE "account_slot" ADD CONSTRAINT "account_slot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_slot" ADD CONSTRAINT "account_slot_socialConnectedAccountId_fkey" FOREIGN KEY ("socialConnectedAccountId") REFERENCES "social_connected_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Publications (Zernio fields)
CREATE TABLE "publication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "destinationScope" TEXT NOT NULL,
    "caption" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "objectKey" TEXT,
    "objectKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zernioPostId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "publication_zernioPostId_key" ON "publication"("zernioPostId");
CREATE UNIQUE INDEX "publication_idempotencyKey_key" ON "publication"("idempotencyKey");
CREATE INDEX "publication_userId_idx" ON "publication"("userId");
CREATE INDEX "publication_status_idx" ON "publication"("status");
CREATE INDEX "publication_zernioPostId_idx" ON "publication"("zernioPostId");

ALTER TABLE "publication" ADD CONSTRAINT "publication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Publication targets
CREATE TABLE "publication_target" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "socialConnectedAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "zernioAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "platformPostId" TEXT,
    "platformPostUrl" TEXT,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_target_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publication_target_publicationId_idx" ON "publication_target"("publicationId");
CREATE INDEX "publication_target_socialConnectedAccountId_idx" ON "publication_target"("socialConnectedAccountId");
CREATE INDEX "publication_target_status_idx" ON "publication_target"("status");

ALTER TABLE "publication_target" ADD CONSTRAINT "publication_target_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication_target" ADD CONSTRAINT "publication_target_socialConnectedAccountId_fkey" FOREIGN KEY ("socialConnectedAccountId") REFERENCES "social_connected_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zernio webhook dedupe
CREATE TABLE "zernio_webhook_event" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zernio_webhook_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zernio_webhook_event_eventId_key" ON "zernio_webhook_event"("eventId");
CREATE INDEX "zernio_webhook_event_eventType_idx" ON "zernio_webhook_event"("eventType");
CREATE INDEX "zernio_webhook_event_createdAt_idx" ON "zernio_webhook_event"("createdAt");

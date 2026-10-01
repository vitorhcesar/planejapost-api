-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- Add nullable workspace columns
ALTER TABLE "social_connected_account" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "social_connect_session" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "publication" ADD COLUMN "workspaceId" TEXT;

-- Backfill default workspaces for users with social accounts, slots, or publications
INSERT INTO "workspace" ("id", "userId", "name", "slug", "isDefault", "sortOrder", "createdAt", "updatedAt")
SELECT
    'ws_' || md5(u."id" || '_default'),
    u."id",
    'Meu workspace',
    'meu-workspace',
    true,
    0,
    NOW(),
    NOW()
FROM "user" u
WHERE EXISTS (
    SELECT 1 FROM "social_connected_account" sca WHERE sca."userId" = u."id"
)
OR EXISTS (
    SELECT 1 FROM "account_slot" s WHERE s."userId" = u."id"
)
OR EXISTS (
    SELECT 1 FROM "publication" p WHERE p."userId" = u."id"
);

-- Assign workspace to existing social accounts
UPDATE "social_connected_account" sca
SET "workspaceId" = w."id"
FROM "workspace" w
WHERE w."userId" = sca."userId"
  AND w."isDefault" = true
  AND sca."workspaceId" IS NULL;

-- Assign workspace to existing connect sessions
UPDATE "social_connect_session" scs
SET "workspaceId" = w."id"
FROM "workspace" w
WHERE w."userId" = scs."userId"
  AND w."isDefault" = true
  AND scs."workspaceId" IS NULL;

-- Create default workspaces for users with orphaned connect sessions (no accounts yet)
INSERT INTO "workspace" ("id", "userId", "name", "slug", "isDefault", "sortOrder", "createdAt", "updatedAt")
SELECT
    'ws_' || md5(u."id" || '_default'),
    u."id",
    'Meu workspace',
    'meu-workspace',
    true,
    0,
    NOW(),
    NOW()
FROM "user" u
WHERE EXISTS (
    SELECT 1 FROM "social_connect_session" scs WHERE scs."userId" = u."id"
)
AND NOT EXISTS (
    SELECT 1 FROM "workspace" w WHERE w."userId" = u."id"
);

UPDATE "social_connect_session" scs
SET "workspaceId" = w."id"
FROM "workspace" w
WHERE w."userId" = scs."userId"
  AND w."isDefault" = true
  AND scs."workspaceId" IS NULL;

-- Make workspaceId NOT NULL on required tables
ALTER TABLE "social_connected_account" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "social_connect_session" ALTER COLUMN "workspaceId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_userId_slug_key" ON "workspace"("userId", "slug");
CREATE INDEX "workspace_userId_archivedAt_idx" ON "workspace"("userId", "archivedAt");
CREATE INDEX "workspace_userId_isDefault_idx" ON "workspace"("userId", "isDefault");
CREATE INDEX "social_connected_account_workspaceId_status_idx" ON "social_connected_account"("workspaceId", "status");
CREATE INDEX "publication_userId_workspaceId_createdAt_idx" ON "publication"("userId", "workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_connected_account" ADD CONSTRAINT "social_connected_account_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "social_connect_session" ADD CONSTRAINT "social_connect_session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publication" ADD CONSTRAINT "publication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

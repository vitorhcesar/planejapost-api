-- Drop account slots and rely on connected social accounts + plan limits.

DROP TABLE IF EXISTS "account_slot";

ALTER TABLE "social_connect_session" DROP COLUMN IF EXISTS "accountSlotId";

ALTER TABLE "social_connect_session"
ADD COLUMN IF NOT EXISTS "reconnectSocialAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "socialConnectedAccountId" TEXT;

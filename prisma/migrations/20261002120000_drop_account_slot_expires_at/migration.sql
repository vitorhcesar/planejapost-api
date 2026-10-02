-- Drop legacy expiresAt column from account_slot.
-- The subscription_plans migration used the wrong column name and did not remove it.
DROP INDEX IF EXISTS "account_slot_expiresAt_idx";
ALTER TABLE "account_slot" DROP COLUMN IF EXISTS "expiresAt";

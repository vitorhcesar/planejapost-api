-- AlterTable
ALTER TABLE "subscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "trialGrantedAt" TIMESTAMP(3),
ADD COLUMN "trialGrantedByUserId" TEXT;

-- AlterTable
ALTER TABLE "subscription_invoice" ADD COLUMN "manualPaidReason" TEXT,
ADD COLUMN "manualPaidByUserId" TEXT,
ADD COLUMN "manualPaidAt" TIMESTAMP(3);

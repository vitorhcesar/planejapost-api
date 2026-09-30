-- AlterTable
ALTER TABLE "user" ADD COLUMN "defaultTimezone" TEXT;

-- AlterTable
ALTER TABLE "publication" ADD COLUMN "scheduledFor" TIMESTAMP(3),
ADD COLUMN "timezone" TEXT,
ADD COLUMN "publishMode" TEXT NOT NULL DEFAULT 'now',
ADD COLUMN "zernioQueueId" TEXT;

-- CreateIndex
CREATE INDEX "publication_scheduledFor_idx" ON "publication"("scheduledFor");

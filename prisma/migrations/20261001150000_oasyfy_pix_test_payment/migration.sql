-- CreateTable
CREATE TABLE "oasyfy_pix_test_payment" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "oasyfyTransactionId" TEXT,
    "pixCode" TEXT,
    "pixImageUrl" TEXT,
    "pixExpiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "webhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oasyfy_pix_test_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oasyfy_pix_test_payment_createdByUserId_idx" ON "oasyfy_pix_test_payment"("createdByUserId");

-- CreateIndex
CREATE INDEX "oasyfy_pix_test_payment_status_idx" ON "oasyfy_pix_test_payment"("status");

-- CreateIndex
CREATE INDEX "oasyfy_pix_test_payment_oasyfyTransactionId_idx" ON "oasyfy_pix_test_payment"("oasyfyTransactionId");

-- Drop wallet tables
DROP TABLE IF EXISTS "wallet_transaction";
DROP TABLE IF EXISTS "wallet_recharge";
DROP TABLE IF EXISTS "wallet";
DROP TABLE IF EXISTS "omegapay_webhook_event";

-- Remove expiresAt from account_slot
ALTER TABLE "account_slot" DROP COLUMN IF EXISTS "expires_at";

-- Billing settings
CREATE TABLE "billing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pixPaymentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cardPaymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "renewalReminderDays" INTEGER[] DEFAULT ARRAY[7, 3],
    "invoiceGenerationLeadDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

-- Subscription plans
CREATE TABLE "subscription_plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthlyBrl" DECIMAL(12,2) NOT NULL,
    "connectionsLimit" INTEGER NOT NULL,
    "postsPerMonthLimit" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "stripePriceId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- Subscriptions
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "preferredPaymentMethod" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "scheduledPlanId" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- Subscription invoices
CREATE TABLE "subscription_invoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "paymentMethod" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "oasyfyTransactionId" TEXT,
    "pixCode" TEXT,
    "pixImageUrl" TEXT,
    "pixExpiresAt" TIMESTAMP(3),
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoice_pkey" PRIMARY KEY ("id")
);

-- Subscription usage records
CREATE TABLE "subscription_usage_record" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "postsUsed" INTEGER NOT NULL DEFAULT 0,
    "connectionsUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_usage_record_pkey" PRIMARY KEY ("id")
);

-- Subscription reminder logs
CREATE TABLE "subscription_reminder_log" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "daysBeforeDue" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_reminder_log_pkey" PRIMARY KEY ("id")
);

-- Oasyfy webhook events
CREATE TABLE "oasyfy_webhook_event" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oasyfy_webhook_event_pkey" PRIMARY KEY ("id")
);

-- Stripe webhook events
CREATE TABLE "stripe_webhook_event" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_event_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "subscription_userId_key" ON "subscription"("userId");
CREATE UNIQUE INDEX "subscription_usage_record_subscriptionId_periodStart_key" ON "subscription_usage_record"("subscriptionId", "periodStart");
CREATE UNIQUE INDEX "subscription_reminder_log_subscriptionId_invoiceId_daysBeforeDue_key" ON "subscription_reminder_log"("subscriptionId", "invoiceId", "daysBeforeDue");
CREATE UNIQUE INDEX "stripe_webhook_event_eventId_key" ON "stripe_webhook_event"("eventId");

-- Indexes
CREATE INDEX "subscription_status_idx" ON "subscription"("status");
CREATE INDEX "subscription_dueAt_idx" ON "subscription"("dueAt");
CREATE INDEX "subscription_gracePeriodEndsAt_idx" ON "subscription"("gracePeriodEndsAt");
CREATE INDEX "subscription_invoice_subscriptionId_idx" ON "subscription_invoice"("subscriptionId");
CREATE INDEX "subscription_invoice_status_idx" ON "subscription_invoice"("status");
CREATE INDEX "subscription_invoice_dueAt_idx" ON "subscription_invoice"("dueAt");
CREATE INDEX "subscription_invoice_oasyfyTransactionId_idx" ON "subscription_invoice"("oasyfyTransactionId");
CREATE INDEX "subscription_invoice_stripeCheckoutSessionId_idx" ON "subscription_invoice"("stripeCheckoutSessionId");
CREATE INDEX "oasyfy_webhook_event_event_idx" ON "oasyfy_webhook_event"("event");
CREATE INDEX "oasyfy_webhook_event_receivedAt_idx" ON "oasyfy_webhook_event"("receivedAt");
CREATE INDEX "stripe_webhook_event_eventType_idx" ON "stripe_webhook_event"("eventType");

-- Foreign keys
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_invoice" ADD CONSTRAINT "subscription_invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_usage_record" ADD CONSTRAINT "subscription_usage_record_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_reminder_log" ADD CONSTRAINT "subscription_reminder_log_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed billing settings
INSERT INTO "billing_settings" ("id", "pixPaymentsEnabled", "cardPaymentsEnabled", "gracePeriodDays", "renewalReminderDays", "invoiceGenerationLeadDays", "updatedAt")
VALUES ('default', true, false, 3, ARRAY[7, 3], 7, NOW());

-- Seed subscription plans
INSERT INTO "subscription_plan" ("id", "name", "priceMonthlyBrl", "connectionsLimit", "postsPerMonthLimit", "features", "sortOrder", "isActive", "updatedAt") VALUES
('essential', 'Essencial', 49.00, 2, 500, '{"scheduling":true,"support_chat":true,"multi_platform":true,"carousel_editor":false,"ai_captions":false,"basic_reports":false,"publish_priority":false,"facebook_business_portfolio":false}', 1, true, NOW()),
('momentum', 'Impulso', 99.00, 5, 1000, '{"scheduling":true,"support_chat":true,"multi_platform":true,"carousel_editor":false,"ai_captions":false,"basic_reports":false,"publish_priority":false,"facebook_business_portfolio":false}', 2, true, NOW()),
('growth', 'Crescimento', 179.00, 10, 1800, '{"scheduling":true,"support_chat":true,"multi_platform":true,"carousel_editor":true,"ai_captions":false,"basic_reports":false,"publish_priority":false,"facebook_business_portfolio":false}', 3, true, NOW()),
('expansion', 'Expansão', 329.00, 20, 5200, '{"scheduling":true,"support_chat":true,"multi_platform":true,"carousel_editor":true,"ai_captions":true,"basic_reports":true,"publish_priority":false,"facebook_business_portfolio":false}', 4, true, NOW()),
('operation', 'Operação', 699.00, 50, 24200, '{"scheduling":true,"support_chat":true,"multi_platform":true,"carousel_editor":true,"ai_captions":true,"basic_reports":true,"publish_priority":true,"facebook_business_portfolio":true}', 5, true, NOW());

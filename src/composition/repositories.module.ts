import type { IAdminAnalyticsRepository } from "@/domain/repositories/admin-analytics.repository";
import type { IBillingSettingsRepository } from "@/domain/repositories/billing-settings.repository";
import type { IEmailVerificationOtpRepository } from "@/domain/repositories/email-verification-otp.repository";
import type { IOasyfyPixTestRepository } from "@/domain/repositories/oasyfy-pix-test.repository";
import type { IOasyfyWebhookRepository } from "@/domain/repositories/oasyfy-webhook.repository";
import type { IPublicationAnalyticsCacheRepository } from "@/domain/repositories/publication-analytics-cache.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IZernioAnalyticsSyncStateRepository } from "@/domain/repositories/zernio-analytics-sync-state.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import type { IStripeWebhookRepository } from "@/domain/repositories/stripe-webhook.repository";
import type { ISubscriptionBillingRepository } from "@/domain/repositories/subscription-billing.repository";
import type { ISubscriptionPlanRepository } from "@/domain/repositories/subscription-plan.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import type { IUserZernioQueueRepository } from "@/domain/repositories/user-zernio-queue.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";
import { PrismaAdminAnalyticsRepository } from "@/infra/database/prisma/repositories/prisma-admin-analytics.repository";
import { PrismaBillingSettingsRepository } from "@/infra/database/prisma/repositories/prisma-billing-settings.repository";
import { PrismaEmailVerificationOtpRepository } from "@/infra/database/prisma/repositories/prisma-email-verification-otp.repository";
import { PrismaOasyfyPixTestRepository } from "@/infra/database/prisma/repositories/prisma-oasyfy-pix-test.repository";
import { PrismaOasyfyWebhookRepository } from "@/infra/database/prisma/repositories/prisma-oasyfy-webhook.repository";
import { PrismaPublicationAnalyticsCacheRepository } from "@/infra/database/prisma/repositories/prisma-publication-analytics-cache.repository";
import { PrismaPublicationRepository } from "@/infra/database/prisma/repositories/prisma-publication.repository";
import { PrismaZernioAnalyticsSyncStateRepository } from "@/infra/database/prisma/repositories/prisma-zernio-analytics-sync-state.repository";
import { PrismaSocialConnectedAccountRepository } from "@/infra/database/prisma/repositories/prisma-social-connected-account.repository";
import { PrismaSocialConnectSessionRepository } from "@/infra/database/prisma/repositories/prisma-social-connect-session.repository";
import { PrismaStripeWebhookRepository } from "@/infra/database/prisma/repositories/prisma-stripe-webhook.repository";
import { PrismaSubscriptionBillingRepository } from "@/infra/database/prisma/repositories/prisma-subscription-billing.repository";
import { PrismaSubscriptionPlanRepository } from "@/infra/database/prisma/repositories/prisma-subscription-plan.repository";
import { PrismaSubscriptionRepository } from "@/infra/database/prisma/repositories/prisma-subscription.repository";
import { PrismaUserZernioQueueRepository } from "@/infra/database/prisma/repositories/prisma-user-zernio-queue.repository";
import { PrismaUserRepository } from "@/infra/database/prisma/repositories/prisma-user.repository";
import { PrismaWorkspaceRepository } from "@/infra/database/prisma/repositories/prisma-workspace.repository";
import { PrismaZernioWebhookEventRepository } from "@/infra/database/prisma/repositories/prisma-zernio-webhook-event.repository";

export interface IRepositories {
  adminAnalytics: IAdminAnalyticsRepository;
  user: IUserRepository;
  userZernioQueue: IUserZernioQueueRepository;
  publication: IPublicationRepository;
  publicationAnalyticsCache: IPublicationAnalyticsCacheRepository;
  socialConnectedAccount: ISocialConnectedAccountRepository;
  socialConnectSession: ISocialConnectSessionRepository;
  zernioWebhookEvent: IZernioWebhookEventRepository;
  zernioAnalyticsSyncState: IZernioAnalyticsSyncStateRepository;
  emailVerificationOtp: IEmailVerificationOtpRepository;
  workspace: IWorkspaceRepository;
  billingSettings: IBillingSettingsRepository;
  subscriptionPlan: ISubscriptionPlanRepository;
  subscription: ISubscriptionRepository;
  subscriptionBilling: ISubscriptionBillingRepository;
  oasyfyPixTest: IOasyfyPixTestRepository;
  oasyfyWebhook: IOasyfyWebhookRepository;
  stripeWebhook: IStripeWebhookRepository;
}

export function createRepositories(): IRepositories {
  return {
    adminAnalytics: new PrismaAdminAnalyticsRepository(),
    user: new PrismaUserRepository(),
    userZernioQueue: new PrismaUserZernioQueueRepository(),
    publication: new PrismaPublicationRepository(),
    publicationAnalyticsCache: new PrismaPublicationAnalyticsCacheRepository(),
    socialConnectedAccount: new PrismaSocialConnectedAccountRepository(),
    socialConnectSession: new PrismaSocialConnectSessionRepository(),
    zernioWebhookEvent: new PrismaZernioWebhookEventRepository(),
    zernioAnalyticsSyncState: new PrismaZernioAnalyticsSyncStateRepository(),
    emailVerificationOtp: new PrismaEmailVerificationOtpRepository(),
    workspace: new PrismaWorkspaceRepository(),
    billingSettings: new PrismaBillingSettingsRepository(),
    subscriptionPlan: new PrismaSubscriptionPlanRepository(),
    subscription: new PrismaSubscriptionRepository(),
    subscriptionBilling: new PrismaSubscriptionBillingRepository(),
    oasyfyPixTest: new PrismaOasyfyPixTestRepository(),
    oasyfyWebhook: new PrismaOasyfyWebhookRepository(),
    stripeWebhook: new PrismaStripeWebhookRepository(),
  };
}

import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IEmailVerificationOtpRepository } from "@/domain/repositories/email-verification-otp.repository";
import type { IOmegaPayWebhookRepository } from "@/domain/repositories/omegapay-webhook.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import type { IUserZernioQueueRepository } from "@/domain/repositories/user-zernio-queue.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";
import type { IWalletBillingRepository } from "@/domain/repositories/wallet-billing.repository";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";
import { PrismaAccountSlotRepository } from "@/infra/database/prisma/repositories/prisma-account-slot.repository";
import { PrismaEmailVerificationOtpRepository } from "@/infra/database/prisma/repositories/prisma-email-verification-otp.repository";
import { PrismaOmegaPayWebhookRepository } from "@/infra/database/prisma/repositories/prisma-omegapay-webhook.repository";
import { PrismaPublicationRepository } from "@/infra/database/prisma/repositories/prisma-publication.repository";
import { PrismaSocialConnectedAccountRepository } from "@/infra/database/prisma/repositories/prisma-social-connected-account.repository";
import { PrismaSocialConnectSessionRepository } from "@/infra/database/prisma/repositories/prisma-social-connect-session.repository";
import { PrismaUserZernioQueueRepository } from "@/infra/database/prisma/repositories/prisma-user-zernio-queue.repository";
import { PrismaUserRepository } from "@/infra/database/prisma/repositories/prisma-user.repository";
import { PrismaWorkspaceRepository } from "@/infra/database/prisma/repositories/prisma-workspace.repository";
import { PrismaWalletBillingRepository } from "@/infra/database/prisma/repositories/prisma-wallet-billing.repository";
import { PrismaWalletRepository } from "@/infra/database/prisma/repositories/prisma-wallet.repository";
import { PrismaZernioWebhookEventRepository } from "@/infra/database/prisma/repositories/prisma-zernio-webhook-event.repository";

export interface IRepositories {
  user: IUserRepository;
  userZernioQueue: IUserZernioQueueRepository;
  wallet: IWalletRepository;
  walletBilling: IWalletBillingRepository;
  publication: IPublicationRepository;
  socialConnectedAccount: ISocialConnectedAccountRepository;
  socialConnectSession: ISocialConnectSessionRepository;
  zernioWebhookEvent: IZernioWebhookEventRepository;
  accountSlot: IAccountSlotRepository;
  omegaPayWebhook: IOmegaPayWebhookRepository;
  emailVerificationOtp: IEmailVerificationOtpRepository;
  workspace: IWorkspaceRepository;
}

export function createRepositories(): IRepositories {
  return {
    user: new PrismaUserRepository(),
    userZernioQueue: new PrismaUserZernioQueueRepository(),
    wallet: new PrismaWalletRepository(),
    walletBilling: new PrismaWalletBillingRepository(),
    publication: new PrismaPublicationRepository(),
    socialConnectedAccount: new PrismaSocialConnectedAccountRepository(),
    socialConnectSession: new PrismaSocialConnectSessionRepository(),
    zernioWebhookEvent: new PrismaZernioWebhookEventRepository(),
    accountSlot: new PrismaAccountSlotRepository(),
    omegaPayWebhook: new PrismaOmegaPayWebhookRepository(),
    emailVerificationOtp: new PrismaEmailVerificationOtpRepository(),
    workspace: new PrismaWorkspaceRepository(),
  };
}

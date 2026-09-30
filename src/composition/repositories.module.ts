import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IEmailVerificationOtpRepository } from "@/domain/repositories/email-verification-otp.repository";
import type { IOmegaPayWebhookRepository } from "@/domain/repositories/omegapay-webhook.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWalletBillingRepository } from "@/domain/repositories/wallet-billing.repository";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";
import { PrismaAccountSlotRepository } from "@/infra/database/prisma/repositories/prisma-account-slot.repository";
import { PrismaEmailVerificationOtpRepository } from "@/infra/database/prisma/repositories/prisma-email-verification-otp.repository";
import { PrismaOmegaPayWebhookRepository } from "@/infra/database/prisma/repositories/prisma-omegapay-webhook.repository";
import { PrismaPublicationRepository } from "@/infra/database/prisma/repositories/prisma-publication.repository";
import { PrismaSocialConnectedAccountRepository } from "@/infra/database/prisma/repositories/prisma-social-connected-account.repository";
import { PrismaSocialConnectSessionRepository } from "@/infra/database/prisma/repositories/prisma-social-connect-session.repository";
import { PrismaUserRepository } from "@/infra/database/prisma/repositories/prisma-user.repository";
import { PrismaWalletBillingRepository } from "@/infra/database/prisma/repositories/prisma-wallet-billing.repository";
import { PrismaWalletRepository } from "@/infra/database/prisma/repositories/prisma-wallet.repository";
import { PrismaZernioWebhookEventRepository } from "@/infra/database/prisma/repositories/prisma-zernio-webhook-event.repository";

export interface IRepositories {
  user: IUserRepository;
  wallet: IWalletRepository;
  walletBilling: IWalletBillingRepository;
  publication: IPublicationRepository;
  socialConnectedAccount: ISocialConnectedAccountRepository;
  socialConnectSession: ISocialConnectSessionRepository;
  zernioWebhookEvent: IZernioWebhookEventRepository;
  accountSlot: IAccountSlotRepository;
  omegaPayWebhook: IOmegaPayWebhookRepository;
  emailVerificationOtp: IEmailVerificationOtpRepository;
}

export function createRepositories(): IRepositories {
  return {
    user: new PrismaUserRepository(),
    wallet: new PrismaWalletRepository(),
    walletBilling: new PrismaWalletBillingRepository(),
    publication: new PrismaPublicationRepository(),
    socialConnectedAccount: new PrismaSocialConnectedAccountRepository(),
    socialConnectSession: new PrismaSocialConnectSessionRepository(),
    zernioWebhookEvent: new PrismaZernioWebhookEventRepository(),
    accountSlot: new PrismaAccountSlotRepository(),
    omegaPayWebhook: new PrismaOmegaPayWebhookRepository(),
    emailVerificationOtp: new PrismaEmailVerificationOtpRepository(),
  };
}

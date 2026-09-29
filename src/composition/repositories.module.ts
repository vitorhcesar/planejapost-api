import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IEmailVerificationOtpRepository } from "@/domain/repositories/email-verification-otp.repository";
import type { IInstagramConnectedAccountRepository } from "@/domain/repositories/instagram-connected-account.repository";
import type { IInstagramOAuthStateRepository } from "@/domain/repositories/instagram-connected-account.repository";
import type { IMetaAppConfigRepository } from "@/domain/repositories/meta-app-config.repository";
import type { IOmegaPayWebhookRepository } from "@/domain/repositories/omegapay-webhook.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWalletBillingRepository } from "@/domain/repositories/wallet-billing.repository";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import { PrismaAccountSlotRepository } from "@/infra/database/prisma/repositories/prisma-account-slot.repository";
import { PrismaEmailVerificationOtpRepository } from "@/infra/database/prisma/repositories/prisma-email-verification-otp.repository";
import { PrismaInstagramConnectedAccountRepository } from "@/infra/database/prisma/repositories/prisma-instagram-connected-account.repository";
import { PrismaInstagramOAuthStateRepository } from "@/infra/database/prisma/repositories/prisma-instagram-oauth-state.repository";
import { PrismaMetaAppConfigRepository } from "@/infra/database/prisma/repositories/prisma-meta-app-config.repository";
import { PrismaOmegaPayWebhookRepository } from "@/infra/database/prisma/repositories/prisma-omegapay-webhook.repository";
import { PrismaPublicationRepository } from "@/infra/database/prisma/repositories/prisma-publication.repository";
import { PrismaUserRepository } from "@/infra/database/prisma/repositories/prisma-user.repository";
import { PrismaWalletBillingRepository } from "@/infra/database/prisma/repositories/prisma-wallet-billing.repository";
import { PrismaWalletRepository } from "@/infra/database/prisma/repositories/prisma-wallet.repository";

export interface IRepositories {
  user: IUserRepository;
  wallet: IWalletRepository;
  walletBilling: IWalletBillingRepository;
  publication: IPublicationRepository;
  instagramConnectedAccount: IInstagramConnectedAccountRepository;
  instagramOAuthState: IInstagramOAuthStateRepository;
  accountSlot: IAccountSlotRepository;
  metaAppConfig: IMetaAppConfigRepository;
  omegaPayWebhook: IOmegaPayWebhookRepository;
  emailVerificationOtp: IEmailVerificationOtpRepository;
}

export function createRepositories(): IRepositories {
  return {
    user: new PrismaUserRepository(),
    wallet: new PrismaWalletRepository(),
    walletBilling: new PrismaWalletBillingRepository(),
    publication: new PrismaPublicationRepository(),
    instagramConnectedAccount: new PrismaInstagramConnectedAccountRepository(),
    instagramOAuthState: new PrismaInstagramOAuthStateRepository(),
    accountSlot: new PrismaAccountSlotRepository(),
    metaAppConfig: new PrismaMetaAppConfigRepository(),
    omegaPayWebhook: new PrismaOmegaPayWebhookRepository(),
    emailVerificationOtp: new PrismaEmailVerificationOtpRepository(),
  };
}

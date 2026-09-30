import {
  GetAccountSlotPricingUseCase,
  ListAccountSlotsUseCase,
  PurchaseAccountSlotsUseCase,
  RenewAccountSlotUseCase,
} from "@/app/usecases/account-slot/account-slot.usecases";
import { GetAdminBillingMetricsUseCase } from "@/app/usecases/admin/get-admin-billing-metrics.usecase";
import { GetAdminDashboardMetricsUseCase } from "@/app/usecases/admin/get-admin-dashboard-metrics.usecase";
import { GetAdminOmegaPayWebhookDetailsUseCase } from "@/app/usecases/admin/get-admin-omegapay-webhook-details.usecase";
import { GetAdminUserDetailsUseCase } from "@/app/usecases/admin/get-admin-user-details.usecase";
import { ListAdminOmegaPayWebhooksUseCase } from "@/app/usecases/admin/list-admin-omegapay-webhooks.usecase";
import { ListAdminUsersUseCase } from "@/app/usecases/admin/list-admin-users.usecase";
import { UpdateAdminUserRoleUseCase } from "@/app/usecases/admin/update-admin-user-role.usecase";
import { SendEmailVerificationOtpUseCase } from "@/app/usecases/email-verification/send-email-verification-otp.usecase";
import { VerifyEmailVerificationOtpUseCase } from "@/app/usecases/email-verification/verify-email-verification-otp.usecase";
import { ReceiveOmegaPayWebhookUseCase } from "@/app/usecases/omegapay/receive-omegapay-webhook.usecase";
import {
  CreateAndPublishPublicationUseCase,
  GetPublicationThumbnailUseCase,
  GetPublicationUseCase,
  ListPublicationsUseCase,
} from "@/app/usecases/publication/create-and-publish-publication.usecase";
import { UploadPublicationMediaUseCase } from "@/app/usecases/publication/upload-publication-media.usecase";
import {
  CompleteSocialConnectUseCase,
  CreateSocialConnectSessionUseCase,
  DisconnectSocialAccountUseCase,
  ListSocialConnectSelectionOptionsUseCase,
  ListSocialConnectedAccountsUseCase,
} from "@/app/usecases/social/social-connected-account.usecases";
import { DeleteUserAccountUseCase } from "@/app/usecases/user/delete-user-account.usecase";
import { GetAuthenticatedUserUseCase } from "@/app/usecases/user/get-authenticated-user.usecase";
import { AdminCreditWalletUseCase } from "@/app/usecases/wallet/admin-credit-wallet.usecase";
import { CreateWalletPixRechargeUseCase } from "@/app/usecases/wallet/create-wallet-pix-recharge.usecase";
import { GetWalletBalanceUseCase } from "@/app/usecases/wallet/get-wallet-balance.usecase";
import { ProcessWalletRechargeFromWebhookUseCase } from "@/app/usecases/wallet/process-wallet-recharge-from-webhook.usecase";
import { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";
import { HandleZernioWebhookUseCase } from "@/app/usecases/zernio/handle-zernio-webhook.usecase";
import type { IInfrastructure } from "@/composition/infrastructure.module";
import type { IRepositories } from "@/composition/repositories.module";

export interface IUseCases {
  user: {
    getAuthenticatedUser: GetAuthenticatedUserUseCase;
    deleteAccount: DeleteUserAccountUseCase;
  };
  emailVerification: {
    sendOtp: SendEmailVerificationOtpUseCase;
    verifyOtp: VerifyEmailVerificationOtpUseCase;
  };
  publication: {
    list: ListPublicationsUseCase;
    uploadMedia: UploadPublicationMediaUseCase;
    createAndPublish: CreateAndPublishPublicationUseCase;
    getThumbnail: GetPublicationThumbnailUseCase;
    get: GetPublicationUseCase;
  };
  wallet: {
    getBalance: GetWalletBalanceUseCase;
    createPixRecharge: CreateWalletPixRechargeUseCase;
    processRechargeFromWebhook: ProcessWalletRechargeFromWebhookUseCase;
    adminCredit: AdminCreditWalletUseCase;
  };
  accountSlot: {
    getPricing: GetAccountSlotPricingUseCase;
    list: ListAccountSlotsUseCase;
    purchase: PurchaseAccountSlotsUseCase;
    renew: RenewAccountSlotUseCase;
  };
  social: {
    createConnectSession: CreateSocialConnectSessionUseCase;
    completeConnect: CompleteSocialConnectUseCase;
    listConnectedAccounts: ListSocialConnectedAccountsUseCase;
    disconnectAccount: DisconnectSocialAccountUseCase;
    listSelectionOptions: ListSocialConnectSelectionOptionsUseCase;
  };
  zernio: {
    ensureProfile: EnsureZernioProfileUseCase;
    handleWebhook: HandleZernioWebhookUseCase;
  };
  omegapay: {
    receiveWebhook: ReceiveOmegaPayWebhookUseCase;
  };
  admin: {
    getDashboardMetrics: GetAdminDashboardMetricsUseCase;
    getBillingMetrics: GetAdminBillingMetricsUseCase;
    listUsers: ListAdminUsersUseCase;
    getUserDetails: GetAdminUserDetailsUseCase;
    updateUserRole: UpdateAdminUserRoleUseCase;
    listOmegaPayWebhooks: ListAdminOmegaPayWebhooksUseCase;
    getOmegaPayWebhookDetails: GetAdminOmegaPayWebhookDetailsUseCase;
  };
}

export function createUseCases(
  repositories: IRepositories,
  infrastructure: IInfrastructure,
): IUseCases {
  const processWalletRechargeFromWebhook = new ProcessWalletRechargeFromWebhookUseCase(
    repositories.wallet,
    infrastructure.logger,
  );

  const ensureZernioProfile = new EnsureZernioProfileUseCase(
    repositories.user,
    infrastructure.zernioClient,
  );

  return {
    user: {
      getAuthenticatedUser: new GetAuthenticatedUserUseCase(repositories.user),
      deleteAccount: new DeleteUserAccountUseCase(repositories.user),
    },
    emailVerification: {
      sendOtp: new SendEmailVerificationOtpUseCase(
        repositories.user,
        repositories.emailVerificationOtp,
        infrastructure.emailService,
      ),
      verifyOtp: new VerifyEmailVerificationOtpUseCase(
        repositories.user,
        repositories.emailVerificationOtp,
      ),
    },
    publication: {
      list: new ListPublicationsUseCase(repositories.publication, infrastructure.logger),
      uploadMedia: new UploadPublicationMediaUseCase(
        infrastructure.temporaryMediaStorage,
        infrastructure.zernioClient,
      ),
      createAndPublish: new CreateAndPublishPublicationUseCase(
        repositories.publication,
        repositories.socialConnectedAccount,
        infrastructure.zernioClient,
        infrastructure.zernioClient,
        infrastructure.temporaryMediaStorage,
      ),
      getThumbnail: new GetPublicationThumbnailUseCase(repositories.publication),
      get: new GetPublicationUseCase(repositories.publication, infrastructure.logger),
    },
    wallet: {
      getBalance: new GetWalletBalanceUseCase(repositories.wallet),
      createPixRecharge: new CreateWalletPixRechargeUseCase(
        repositories.wallet,
        repositories.user,
        infrastructure.omegaPayClient,
        infrastructure.publicApiConfig,
      ),
      processRechargeFromWebhook: processWalletRechargeFromWebhook,
      adminCredit: new AdminCreditWalletUseCase(repositories.wallet),
    },
    accountSlot: {
      getPricing: new GetAccountSlotPricingUseCase(),
      list: new ListAccountSlotsUseCase(repositories.accountSlot),
      purchase: new PurchaseAccountSlotsUseCase(
        repositories.accountSlot,
        repositories.wallet,
      ),
      renew: new RenewAccountSlotUseCase(
        repositories.accountSlot,
        repositories.wallet,
      ),
    },
    social: {
      createConnectSession: new CreateSocialConnectSessionUseCase(
        ensureZernioProfile,
        repositories.socialConnectSession,
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        infrastructure.zernioClient,
        infrastructure.frontendOrigin,
      ),
      completeConnect: new CompleteSocialConnectUseCase(
        repositories.socialConnectSession,
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        infrastructure.zernioClient,
        infrastructure.zernioClient,
      ),
      listConnectedAccounts: new ListSocialConnectedAccountsUseCase(
        repositories.socialConnectedAccount,
        repositories.accountSlot,
      ),
      disconnectAccount: new DisconnectSocialAccountUseCase(
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        infrastructure.zernioClient,
      ),
      listSelectionOptions: new ListSocialConnectSelectionOptionsUseCase(
        repositories.socialConnectSession,
        infrastructure.zernioClient,
      ),
    },
    zernio: {
      ensureProfile: ensureZernioProfile,
      handleWebhook: new HandleZernioWebhookUseCase(
        repositories.zernioWebhookEvent,
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        repositories.publication,
        infrastructure.logger,
      ),
    },
    omegapay: {
      receiveWebhook: new ReceiveOmegaPayWebhookUseCase(
        repositories.omegaPayWebhook,
        processWalletRechargeFromWebhook,
        infrastructure.logger,
      ),
    },
    admin: {
      getDashboardMetrics: new GetAdminDashboardMetricsUseCase(
        repositories.user,
        repositories.socialConnectedAccount,
        repositories.publication,
      ),
      getBillingMetrics: new GetAdminBillingMetricsUseCase(
        repositories.walletBilling,
      ),
      listUsers: new ListAdminUsersUseCase(
        repositories.user,
        repositories.wallet,
      ),
      getUserDetails: new GetAdminUserDetailsUseCase(
        repositories.user,
        repositories.wallet,
      ),
      updateUserRole: new UpdateAdminUserRoleUseCase(repositories.user),
      listOmegaPayWebhooks: new ListAdminOmegaPayWebhooksUseCase(
        repositories.omegaPayWebhook,
      ),
      getOmegaPayWebhookDetails: new GetAdminOmegaPayWebhookDetailsUseCase(
        repositories.omegaPayWebhook,
      ),
    },
  };
}

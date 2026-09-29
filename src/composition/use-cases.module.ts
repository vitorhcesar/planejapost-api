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
import {
  CompleteInstagramConnectUseCase,
  CreateInstagramConnectSessionUseCase,
  DisconnectInstagramAccountUseCase,
  ListInstagramConnectedAccountsUseCase,
} from "@/app/usecases/instagram/instagram-connected-account.usecases";
import { HandleInstagramMetaComplianceUseCase } from "@/app/usecases/instagram/handle-instagram-meta-compliance.usecase";
import {
  CreateMetaAppConfigUseCase,
  DeleteMetaAppConfigUseCase,
  GetMetaAppConfigUseCase,
  ReplaceMetaAppConfigUseCase,
  RotateMetaAppSecretUseCase,
} from "@/app/usecases/meta-app-config/meta-app-config.usecases";
import { ReceiveOmegaPayWebhookUseCase } from "@/app/usecases/omegapay/receive-omegapay-webhook.usecase";
import {
  CreateAndPublishPublicationUseCase,
  GetPublicationThumbnailUseCase,
  GetPublicationUseCase,
  ListPublicationsUseCase,
} from "@/app/usecases/publication/create-and-publish-publication.usecase";
import { UploadPublicationMediaUseCase } from "@/app/usecases/publication/upload-publication-media.usecase";
import { DeleteUserAccountUseCase } from "@/app/usecases/user/delete-user-account.usecase";
import { GetAuthenticatedUserUseCase } from "@/app/usecases/user/get-authenticated-user.usecase";
import { AdminCreditWalletUseCase } from "@/app/usecases/wallet/admin-credit-wallet.usecase";
import { CreateWalletPixRechargeUseCase } from "@/app/usecases/wallet/create-wallet-pix-recharge.usecase";
import { GetWalletBalanceUseCase } from "@/app/usecases/wallet/get-wallet-balance.usecase";
import { ProcessWalletRechargeFromWebhookUseCase } from "@/app/usecases/wallet/process-wallet-recharge-from-webhook.usecase";
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
  instagram: {
    createConnectSession: CreateInstagramConnectSessionUseCase;
    completeConnect: CompleteInstagramConnectUseCase;
    listConnectedAccounts: ListInstagramConnectedAccountsUseCase;
    disconnectAccount: DisconnectInstagramAccountUseCase;
    handleMetaCompliance: HandleInstagramMetaComplianceUseCase;
  };
  metaAppConfig: {
    get: GetMetaAppConfigUseCase;
    create: CreateMetaAppConfigUseCase;
    replace: ReplaceMetaAppConfigUseCase;
    rotateSecret: RotateMetaAppSecretUseCase;
    delete: DeleteMetaAppConfigUseCase;
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
      list: new ListPublicationsUseCase(repositories.publication),
      uploadMedia: new UploadPublicationMediaUseCase(
        infrastructure.temporaryMediaStorage,
      ),
      createAndPublish: new CreateAndPublishPublicationUseCase(
        repositories.publication,
        repositories.instagramConnectedAccount,
        infrastructure.publicationQueue,
        infrastructure.publicApiConfig,
      ),
      getThumbnail: new GetPublicationThumbnailUseCase(
        repositories.publication,
        repositories.instagramConnectedAccount,
        infrastructure.instagramGraphClient,
      ),
      get: new GetPublicationUseCase(repositories.publication),
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
    instagram: {
      createConnectSession: new CreateInstagramConnectSessionUseCase(
        repositories.instagramOAuthState,
        infrastructure.instagramOAuthClientFactory,
        repositories.accountSlot,
        repositories.instagramConnectedAccount,
        repositories.metaAppConfig,
      ),
      completeConnect: new CompleteInstagramConnectUseCase(
        repositories.instagramOAuthState,
        repositories.instagramConnectedAccount,
        infrastructure.instagramOAuthClientFactory,
        infrastructure.instagramGraphClient,
        repositories.accountSlot,
        repositories.metaAppConfig,
      ),
      listConnectedAccounts: new ListInstagramConnectedAccountsUseCase(
        repositories.instagramConnectedAccount,
      ),
      disconnectAccount: new DisconnectInstagramAccountUseCase(
        repositories.instagramConnectedAccount,
        repositories.accountSlot,
      ),
      handleMetaCompliance: new HandleInstagramMetaComplianceUseCase(
        repositories.instagramConnectedAccount,
        repositories.accountSlot,
        infrastructure.frontendOrigin,
      ),
    },
    metaAppConfig: {
      get: new GetMetaAppConfigUseCase(
        repositories.metaAppConfig,
        infrastructure.publicApiUrl,
      ),
      create: new CreateMetaAppConfigUseCase(
        repositories.metaAppConfig,
        infrastructure.metaAppRuntimeOptions,
      ),
      replace: new ReplaceMetaAppConfigUseCase(
        repositories.metaAppConfig,
        infrastructure.metaAppRuntimeOptions,
      ),
      rotateSecret: new RotateMetaAppSecretUseCase(repositories.metaAppConfig),
      delete: new DeleteMetaAppConfigUseCase(repositories.metaAppConfig),
    },
    omegapay: {
      receiveWebhook: new ReceiveOmegaPayWebhookUseCase(
        repositories.omegaPayWebhook,
        processWalletRechargeFromWebhook,
      ),
    },
    admin: {
      getDashboardMetrics: new GetAdminDashboardMetricsUseCase(
        repositories.user,
        repositories.instagramConnectedAccount,
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

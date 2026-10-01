import { ListAccountSlotsUseCase } from "@/app/usecases/account-slot/account-slot.usecases";
import {
  AdminMarkInvoicePaidUseCase,
  GetAdminBillingSettingsUseCase,
  GetAdminSubscriptionDetailsUseCase,
  ListAdminOasyfyWebhooksUseCase,
  ListAdminStripeWebhooksUseCase,
  ListAdminSubscriptionsUseCase,
  UpdateAdminBillingSettingsUseCase,
  UpdateAdminSubscriptionUseCase,
} from "@/app/usecases/admin/admin-subscription.usecases";
import { GetAdminBillingMetricsUseCase } from "@/app/usecases/admin/get-admin-billing-metrics.usecase";
import { GetAdminDashboardMetricsUseCase } from "@/app/usecases/admin/get-admin-dashboard-metrics.usecase";
import { GetAdminUserDetailsUseCase } from "@/app/usecases/admin/get-admin-user-details.usecase";
import { ListAdminUsersUseCase } from "@/app/usecases/admin/list-admin-users.usecase";
import { UpdateAdminUserRoleUseCase } from "@/app/usecases/admin/update-admin-user-role.usecase";
import { SendEmailVerificationOtpUseCase } from "@/app/usecases/email-verification/send-email-verification-otp.usecase";
import { VerifyEmailVerificationOtpUseCase } from "@/app/usecases/email-verification/verify-email-verification-otp.usecase";
import { ReceiveOasyfyWebhookUseCase } from "@/app/usecases/oasyfy/receive-oasyfy-webhook.usecase";
import {
  CreateAndPublishPublicationUseCase,
  GetPublicationThumbnailUseCase,
  GetPublicationUseCase,
  ListPublicationsUseCase,
} from "@/app/usecases/publication/create-and-publish-publication.usecase";
import { UploadPublicationMediaUseCase } from "@/app/usecases/publication/upload-publication-media.usecase";
import {
  CancelPublicationUseCase,
  ReschedulePublicationUseCase,
} from "@/app/usecases/publication/schedule-publication.usecase";
import {
  GetPublicationQueueUseCase,
  UpsertPublicationQueueUseCase,
} from "@/app/usecases/publication/publication-queue.usecase";
import {
  CompleteSocialConnectUseCase,
  CreateSocialConnectSessionUseCase,
  DisconnectSocialAccountUseCase,
  ListSocialConnectSelectionOptionsUseCase,
  ListSocialConnectedAccountsUseCase,
} from "@/app/usecases/social/social-connected-account.usecases";
import { ReceiveStripeWebhookUseCase } from "@/app/usecases/stripe/receive-stripe-webhook.usecase";
import { ProvisionAccountSlotsUseCase } from "@/app/usecases/subscription/provision-account-slots.usecase";
import { SubscriptionEmailService } from "@/app/usecases/subscription/subscription-email.service";
import {
  ExpireSubscriptionForNonPaymentUseCase,
  ExpireUnpaidPixInvoicesJob,
  GenerateRenewalInvoicesJob,
  ProcessOverdueSubscriptionsJob,
  SendRenewalReminderEmailsJob,
} from "@/app/usecases/subscription/subscription-jobs.usecases";
import {
  AssertSubscriptionForConnectUseCase,
  AssertSubscriptionForPublishUseCase,
  CancelSubscriptionUseCase,
  ChangeSubscriptionPlanUseCase,
  GetBillingSettingsUseCase,
  GetMySubscriptionUseCase,
  GetPaymentMethodsUseCase,
  ListSubscriptionPlansUseCase,
  PaySubscriptionInvoiceUseCase,
  ProcessSubscriptionInvoicePaymentUseCase,
  SubscribeToPlanUseCase,
  UpdateBillingSettingsUseCase,
} from "@/app/usecases/subscription/subscription.usecases";
import { DeleteUserAccountUseCase } from "@/app/usecases/user/delete-user-account.usecase";
import { GetAuthenticatedUserUseCase } from "@/app/usecases/user/get-authenticated-user.usecase";
import { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";
import { HandleZernioWebhookUseCase } from "@/app/usecases/zernio/handle-zernio-webhook.usecase";
import {
  ArchiveWorkspaceUseCase,
  CreateWorkspaceUseCase,
  EnsureDefaultWorkspaceUseCase,
  ListWorkspacesUseCase,
  MoveSocialAccountToWorkspaceUseCase,
  UpdateWorkspaceUseCase,
} from "@/app/usecases/workspace/workspace.usecases";
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
    reschedule: ReschedulePublicationUseCase;
    cancel: CancelPublicationUseCase;
    getQueue: GetPublicationQueueUseCase;
    upsertQueue: UpsertPublicationQueueUseCase;
  };
  accountSlot: {
    list: ListAccountSlotsUseCase;
  };
  social: {
    createConnectSession: CreateSocialConnectSessionUseCase;
    completeConnect: CompleteSocialConnectUseCase;
    listConnectedAccounts: ListSocialConnectedAccountsUseCase;
    disconnectAccount: DisconnectSocialAccountUseCase;
    listSelectionOptions: ListSocialConnectSelectionOptionsUseCase;
    moveAccountToWorkspace: MoveSocialAccountToWorkspaceUseCase;
  };
  workspace: {
    ensureDefault: EnsureDefaultWorkspaceUseCase;
    list: ListWorkspacesUseCase;
    create: CreateWorkspaceUseCase;
    update: UpdateWorkspaceUseCase;
    archive: ArchiveWorkspaceUseCase;
  };
  zernio: {
    ensureProfile: EnsureZernioProfileUseCase;
    handleWebhook: HandleZernioWebhookUseCase;
  };
  subscription: {
    listPlans: ListSubscriptionPlansUseCase;
    getPaymentMethods: GetPaymentMethodsUseCase;
    getBillingSettings: GetBillingSettingsUseCase;
    updateBillingSettings: UpdateBillingSettingsUseCase;
    getMySubscription: GetMySubscriptionUseCase;
    subscribe: SubscribeToPlanUseCase;
    payInvoice: PaySubscriptionInvoiceUseCase;
    changePlan: ChangeSubscriptionPlanUseCase;
    cancel: CancelSubscriptionUseCase;
    processInvoicePayment: ProcessSubscriptionInvoicePaymentUseCase;
    assertForPublish: AssertSubscriptionForPublishUseCase;
    assertForConnect: AssertSubscriptionForConnectUseCase;
    jobs: {
      generateRenewalInvoices: GenerateRenewalInvoicesJob;
      sendRenewalReminders: SendRenewalReminderEmailsJob;
      processOverdue: ProcessOverdueSubscriptionsJob;
      expireUnpaidPixInvoices: ExpireUnpaidPixInvoicesJob;
    };
    expireForNonPayment: ExpireSubscriptionForNonPaymentUseCase;
  };
  oasyfy: {
    receiveWebhook: ReceiveOasyfyWebhookUseCase;
  };
  stripe: {
    receiveWebhook: ReceiveStripeWebhookUseCase;
  };
  admin: {
    getDashboardMetrics: GetAdminDashboardMetricsUseCase;
    getBillingMetrics: GetAdminBillingMetricsUseCase;
    listUsers: ListAdminUsersUseCase;
    getUserDetails: GetAdminUserDetailsUseCase;
    updateUserRole: UpdateAdminUserRoleUseCase;
    listSubscriptions: ListAdminSubscriptionsUseCase;
    getSubscriptionDetails: GetAdminSubscriptionDetailsUseCase;
    updateSubscription: UpdateAdminSubscriptionUseCase;
    markInvoicePaid: AdminMarkInvoicePaidUseCase;
    listOasyfyWebhooks: ListAdminOasyfyWebhooksUseCase;
    listStripeWebhooks: ListAdminStripeWebhooksUseCase;
    getBillingSettings: GetAdminBillingSettingsUseCase;
    updateBillingSettings: UpdateAdminBillingSettingsUseCase;
  };
}

export function createUseCases(
  repositories: IRepositories,
  infrastructure: IInfrastructure,
): IUseCases {
  const subscriptionEmailService = new SubscriptionEmailService(
    infrastructure.emailService,
  );

  const provisionAccountSlots = new ProvisionAccountSlotsUseCase(
    repositories.accountSlot,
  );

  const processInvoicePayment = new ProcessSubscriptionInvoicePaymentUseCase(
    repositories.subscription,
    repositories.subscriptionPlan,
    provisionAccountSlots,
  );

  const expireForNonPayment = new ExpireSubscriptionForNonPaymentUseCase(
    repositories.subscription,
    repositories.socialConnectedAccount,
    provisionAccountSlots,
    infrastructure.zernioClient,
    repositories.user,
    subscriptionEmailService,
    infrastructure.logger,
  );

  const assertForPublish = new AssertSubscriptionForPublishUseCase(
    repositories.subscription,
  );

  const assertForConnect = new AssertSubscriptionForConnectUseCase(
    repositories.subscription,
  );

  const ensureZernioProfile = new EnsureZernioProfileUseCase(
    repositories.user,
    infrastructure.zernioClient,
  );

  const ensureDefaultWorkspace = new EnsureDefaultWorkspaceUseCase(
    repositories.workspace,
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
      list: new ListPublicationsUseCase(
        repositories.publication,
        infrastructure.logger,
        infrastructure.zernioClient,
      ),
      uploadMedia: new UploadPublicationMediaUseCase(infrastructure.zernioClient),
      createAndPublish: new CreateAndPublishPublicationUseCase(
        repositories.publication,
        repositories.socialConnectedAccount,
        repositories.workspace,
        ensureDefaultWorkspace,
        repositories.user,
        repositories.userZernioQueue,
        ensureZernioProfile,
        infrastructure.zernioClient,
        assertForPublish,
      ),
      getThumbnail: new GetPublicationThumbnailUseCase(repositories.publication),
      get: new GetPublicationUseCase(
        repositories.publication,
        infrastructure.logger,
        infrastructure.zernioClient,
      ),
      reschedule: new ReschedulePublicationUseCase(
        repositories.publication,
        infrastructure.zernioClient,
      ),
      cancel: new CancelPublicationUseCase(
        repositories.publication,
        infrastructure.zernioClient,
      ),
      getQueue: new GetPublicationQueueUseCase(
        repositories.user,
        repositories.userZernioQueue,
        ensureZernioProfile,
        infrastructure.zernioClient,
      ),
      upsertQueue: new UpsertPublicationQueueUseCase(
        repositories.user,
        repositories.userZernioQueue,
        ensureZernioProfile,
        infrastructure.zernioClient,
      ),
    },
    accountSlot: {
      list: new ListAccountSlotsUseCase(repositories.accountSlot),
    },
    social: {
      createConnectSession: new CreateSocialConnectSessionUseCase(
        ensureZernioProfile,
        ensureDefaultWorkspace,
        repositories.socialConnectSession,
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        repositories.workspace,
        infrastructure.zernioClient,
        infrastructure.frontendOrigin,
        assertForConnect,
      ),
      completeConnect: new CompleteSocialConnectUseCase(
        repositories.socialConnectSession,
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        repositories.workspace,
        infrastructure.zernioClient,
        infrastructure.zernioClient,
      ),
      listConnectedAccounts: new ListSocialConnectedAccountsUseCase(
        repositories.socialConnectedAccount,
        repositories.accountSlot,
        repositories.workspace,
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
      moveAccountToWorkspace: new MoveSocialAccountToWorkspaceUseCase(
        repositories.workspace,
        repositories.socialConnectedAccount,
      ),
    },
    workspace: {
      ensureDefault: ensureDefaultWorkspace,
      list: new ListWorkspacesUseCase(
        repositories.workspace,
        ensureDefaultWorkspace,
      ),
      create: new CreateWorkspaceUseCase(repositories.workspace),
      update: new UpdateWorkspaceUseCase(repositories.workspace),
      archive: new ArchiveWorkspaceUseCase(repositories.workspace),
    },
    zernio: {
      ensureProfile: ensureZernioProfile,
      handleWebhook: new HandleZernioWebhookUseCase(
        repositories.zernioWebhookEvent,
        repositories.socialConnectedAccount,
        repositories.socialConnectSession,
        repositories.accountSlot,
        repositories.publication,
        infrastructure.zernioClient,
        infrastructure.logger,
      ),
    },
    subscription: {
      listPlans: new ListSubscriptionPlansUseCase(repositories.subscriptionPlan),
      getPaymentMethods: new GetPaymentMethodsUseCase(repositories.billingSettings),
      getBillingSettings: new GetBillingSettingsUseCase(repositories.billingSettings),
      updateBillingSettings: new UpdateBillingSettingsUseCase(
        repositories.billingSettings,
      ),
      getMySubscription: new GetMySubscriptionUseCase(repositories.subscription),
      subscribe: new SubscribeToPlanUseCase(
        repositories.subscription,
        repositories.subscriptionPlan,
        repositories.billingSettings,
        repositories.user,
        infrastructure.oasyfyClient,
        infrastructure.stripeClient,
        infrastructure.publicApiConfig,
        infrastructure.frontendOrigin,
      ),
      payInvoice: new PaySubscriptionInvoiceUseCase(
        repositories.subscription,
        repositories.user,
        infrastructure.oasyfyClient,
        infrastructure.stripeClient,
        repositories.billingSettings,
        infrastructure.publicApiConfig,
        infrastructure.frontendOrigin,
      ),
      changePlan: new ChangeSubscriptionPlanUseCase(
        repositories.subscription,
        repositories.subscriptionPlan,
      ),
      cancel: new CancelSubscriptionUseCase(repositories.subscription),
      processInvoicePayment,
      assertForPublish,
      assertForConnect,
      jobs: {
        generateRenewalInvoices: new GenerateRenewalInvoicesJob(
          repositories.subscription,
          repositories.billingSettings,
          infrastructure.logger,
        ),
        sendRenewalReminders: new SendRenewalReminderEmailsJob(
          repositories.subscription,
          repositories.billingSettings,
          repositories.user,
          subscriptionEmailService,
          infrastructure.logger,
        ),
        processOverdue: new ProcessOverdueSubscriptionsJob(
          repositories.subscription,
          repositories.billingSettings,
          expireForNonPayment,
          subscriptionEmailService,
          repositories.user,
          infrastructure.logger,
        ),
        expireUnpaidPixInvoices: new ExpireUnpaidPixInvoicesJob(
          repositories.subscription,
          infrastructure.logger,
        ),
      },
      expireForNonPayment,
    },
    oasyfy: {
      receiveWebhook: new ReceiveOasyfyWebhookUseCase(
        repositories.oasyfyWebhook,
        repositories.subscription,
        processInvoicePayment,
        infrastructure.logger,
      ),
    },
    stripe: {
      receiveWebhook: new ReceiveStripeWebhookUseCase(
        repositories.stripeWebhook,
        repositories.subscription,
        processInvoicePayment,
        infrastructure.stripeClient,
        infrastructure.logger,
      ),
    },
    admin: {
      getDashboardMetrics: new GetAdminDashboardMetricsUseCase(
        repositories.adminAnalytics,
      ),
      getBillingMetrics: new GetAdminBillingMetricsUseCase(
        repositories.subscriptionBilling,
        repositories.adminAnalytics,
      ),
      listUsers: new ListAdminUsersUseCase(
        repositories.user,
        repositories.subscription,
      ),
      getUserDetails: new GetAdminUserDetailsUseCase(
        repositories.user,
        repositories.subscription,
      ),
      updateUserRole: new UpdateAdminUserRoleUseCase(repositories.user),
      listSubscriptions: new ListAdminSubscriptionsUseCase(repositories.subscription),
      getSubscriptionDetails: new GetAdminSubscriptionDetailsUseCase(
        repositories.subscription,
      ),
      updateSubscription: new UpdateAdminSubscriptionUseCase(repositories.subscription),
      markInvoicePaid: new AdminMarkInvoicePaidUseCase(repositories.subscription),
      listOasyfyWebhooks: new ListAdminOasyfyWebhooksUseCase(
        repositories.oasyfyWebhook,
      ),
      listStripeWebhooks: new ListAdminStripeWebhooksUseCase(
        repositories.stripeWebhook,
      ),
      getBillingSettings: new GetAdminBillingSettingsUseCase(
        repositories.billingSettings,
      ),
      updateBillingSettings: new UpdateAdminBillingSettingsUseCase(
        repositories.billingSettings,
      ),
    },
  };
}

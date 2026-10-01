import type {
  PaymentMethodEnum,
  SubscriptionInvoiceStatusEnum,
  SubscriptionInvoiceTypeEnum,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";

export interface ISubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatusEnum;
  preferredPaymentMethod: PaymentMethodEnum | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  dueAt: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionInvoice {
  id: string;
  subscriptionId: string;
  type: SubscriptionInvoiceTypeEnum;
  status: SubscriptionInvoiceStatusEnum;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodEnum | null;
  dueAt: Date;
  paidAt: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  oasyfyTransactionId: string | null;
  pixCode: string | null;
  pixImageUrl: string | null;
  pixExpiresAt: Date | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionWithPlan extends ISubscription {
  plan: {
    id: string;
    name: string;
    priceMonthlyBrl: number;
    connectionsLimit: number;
    postsPerMonthLimit: number;
    features: Record<string, boolean>;
  };
}

export interface ICreateSubscriptionInput {
  userId: string;
  planId: string;
  preferredPaymentMethod: PaymentMethodEnum;
}

export interface ICreateSubscriptionInvoiceInput {
  subscriptionId: string;
  type: SubscriptionInvoiceTypeEnum;
  amount: number;
  paymentMethod: PaymentMethodEnum;
  dueAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface ISubscriptionRepository {
  findByUserId(userId: string): Promise<ISubscriptionWithPlan | null>;
  findById(id: string): Promise<ISubscriptionWithPlan | null>;
  create(input: ICreateSubscriptionInput): Promise<ISubscription>;
  updateStatus(id: string, status: SubscriptionStatusEnum): Promise<ISubscription>;
  activateSubscription(
    id: string,
    input: {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      dueAt: Date;
      planId?: string;
    },
  ): Promise<ISubscription>;
  setPastDue(id: string, gracePeriodEndsAt: Date): Promise<ISubscription>;
  setExpired(id: string): Promise<ISubscription>;
  setCancelAtPeriodEnd(id: string, cancelAtPeriodEnd: boolean): Promise<ISubscription>;
  setScheduledPlanId(id: string, scheduledPlanId: string | null): Promise<ISubscription>;
  setStripeCustomerId(id: string, stripeCustomerId: string): Promise<ISubscription>;
  listForRenewalInvoiceGeneration(leadDays: number): Promise<ISubscriptionWithPlan[]>;
  listForOverdueProcessing(): Promise<ISubscriptionWithPlan[]>;
  listForExpiration(): Promise<ISubscriptionWithPlan[]>;
  listForRenewalReminders(): Promise<
    Array<ISubscriptionWithPlan & { openInvoice: ISubscriptionInvoice }>
  >;
  listAdmin(filters: {
    status?: string;
    planId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ISubscriptionWithPlan[]; total: number }>;
  createInvoice(input: ICreateSubscriptionInvoiceInput): Promise<ISubscriptionInvoice>;
  findInvoiceById(id: string): Promise<ISubscriptionInvoice | null>;
  findInvoiceByIdForUser(
    invoiceId: string,
    userId: string,
  ): Promise<ISubscriptionInvoice | null>;
  findOpenRenewalInvoice(subscriptionId: string): Promise<ISubscriptionInvoice | null>;
  findOpenInvoiceBySubscriptionId(
    subscriptionId: string,
  ): Promise<ISubscriptionInvoice | null>;
  updateInvoiceAfterPixCreation(
    invoiceId: string,
    input: {
      oasyfyTransactionId: string;
      pixCode: string;
      pixImageUrl: string | null;
      pixExpiresAt: Date;
      status: SubscriptionInvoiceStatusEnum;
    },
  ): Promise<ISubscriptionInvoice>;
  updateInvoiceAfterStripeCheckout(
    invoiceId: string,
    input: {
      stripeCheckoutSessionId: string;
      status: SubscriptionInvoiceStatusEnum;
    },
  ): Promise<ISubscriptionInvoice>;
  markInvoicePaid(
    invoiceId: string,
    input?: {
      stripePaymentIntentId?: string;
      paidAt?: Date;
    },
  ): Promise<ISubscriptionInvoice>;
  cancelInvoice(invoiceId: string): Promise<ISubscriptionInvoice>;
  expireUnpaidPixInvoices(): Promise<ISubscriptionInvoice[]>;
  countPostsInPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number>;
  countConnectedAccounts(userId: string): Promise<number>;
  createReminderLog(
    subscriptionId: string,
    invoiceId: string,
    daysBeforeDue: number,
  ): Promise<void>;
  hasReminderLog(
    subscriptionId: string,
    invoiceId: string,
    daysBeforeDue: number,
  ): Promise<boolean>;
  findInvoiceByOasyfyTransactionId(
    transactionId: string,
  ): Promise<ISubscriptionInvoice | null>;
  findInvoiceByStripeCheckoutSessionId(
    sessionId: string,
  ): Promise<ISubscriptionInvoice | null>;
  listInvoicesBySubscriptionId(subscriptionId: string): Promise<ISubscriptionInvoice[]>;
  adminUpdateSubscription(
    id: string,
    input: Partial<{
      planId: string;
      status: SubscriptionStatusEnum;
      currentPeriodEnd: Date;
      dueAt: Date;
      cancelAtPeriodEnd: boolean;
    }>,
  ): Promise<ISubscription>;
  adminMarkInvoicePaid(invoiceId: string): Promise<ISubscriptionInvoice>;
}

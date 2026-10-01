import type { PaymentMethodEnum, SubscriptionStatusEnum } from "@/domain/enums/subscription.enum";

export interface ISubscriptionPlanDto {
  id: string;
  name: string;
  priceMonthlyBrl: number;
  connectionsLimit: number;
  postsPerMonthLimit: number;
  features: string[];
  sortOrder: number;
}

export interface ISubscriptionMeDto {
  subscription: {
    planId: string;
    planName: string;
    status: SubscriptionStatusEnum;
    preferredPaymentMethod: PaymentMethodEnum | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    dueAt: string | null;
    gracePeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    scheduledPlanId: string | null;
  } | null;
  usage: {
    connectionsUsed: number;
    connectionsLimit: number;
    postsUsed: number;
    postsPerMonthLimit: number;
  } | null;
  openInvoice: {
    id: string;
    amount: number;
    dueAt: string;
    status: string;
  } | null;
  invoices: Array<{
    id: string;
    type: string;
    status: string;
    amount: number;
    dueAt: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  features: string[];
}

export interface ISubscribeResultDto {
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  pixCode?: string;
  pixImageUrl?: string | null;
  expiresAt?: string;
  checkoutUrl?: string;
}

export interface IPaymentMethodsDto {
  pix: boolean;
  card: boolean;
}

export interface IBillingSettingsDto {
  pixPaymentsEnabled: boolean;
  cardPaymentsEnabled: boolean;
  gracePeriodDays: number;
  renewalReminderDays: number[];
  invoiceGenerationLeadDays: number;
}

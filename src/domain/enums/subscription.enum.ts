export enum SubscriptionStatusEnum {
  PENDING = "pending",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  TRIAL = "trial",
  EXPIRED = "expired",
  CANCELED = "canceled",
}

export enum SubscriptionInvoiceTypeEnum {
  INITIAL = "initial",
  RENEWAL = "renewal",
  UPGRADE = "upgrade",
}

export enum SubscriptionInvoiceStatusEnum {
  OPEN = "open",
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  CANCELED = "canceled",
  EXPIRED = "expired",
}

export enum PaymentMethodEnum {
  PIX = "pix",
  CARD = "card",
}

export enum SubscriptionPlanIdEnum {
  ESSENTIAL = "essential",
  MOMENTUM = "momentum",
  GROWTH = "growth",
  EXPANSION = "expansion",
  OPERATION = "operation",
}

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set<string>([
  SubscriptionStatusEnum.ACTIVE,
  SubscriptionStatusEnum.PAST_DUE,
  SubscriptionStatusEnum.TRIAL,
]);

export const COUNTABLE_PUBLICATION_STATUSES = new Set<string>([
  "pending",
  "processing",
  "scheduled",
  "completed",
]);

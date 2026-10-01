import {
  COUNTABLE_PUBLICATION_STATUSES,
  PaymentMethodEnum,
  SubscriptionInvoiceStatusEnum,
  SubscriptionInvoiceTypeEnum,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";
import type {
  ICreateSubscriptionInput,
  ICreateSubscriptionInvoiceInput,
  ISubscription,
  ISubscriptionInvoice,
  ISubscriptionRepository,
  ISubscriptionWithPlan,
} from "@/domain/repositories/subscription.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import type { Prisma } from "../../../../../generated/prisma";

function mapSubscription(row: {
  id: string;
  userId: string;
  planId: string;
  status: string;
  preferredPaymentMethod: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  dueAt: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null;
  stripeCustomerId: string | null;
  trialEndsAt: Date | null;
  trialGrantedAt: Date | null;
  trialGrantedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ISubscription {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    status: row.status as SubscriptionStatusEnum,
    preferredPaymentMethod: row.preferredPaymentMethod as PaymentMethodEnum | null,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    dueAt: row.dueAt,
    gracePeriodEndsAt: row.gracePeriodEndsAt,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    scheduledPlanId: row.scheduledPlanId,
    stripeCustomerId: row.stripeCustomerId,
    trialEndsAt: row.trialEndsAt,
    trialGrantedAt: row.trialGrantedAt,
    trialGrantedByUserId: row.trialGrantedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapInvoice(row: {
  id: string;
  subscriptionId: string;
  type: string;
  status: string;
  amount: Prisma.Decimal;
  currency: string;
  paymentMethod: string | null;
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
  manualPaidReason: string | null;
  manualPaidByUserId: string | null;
  manualPaidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ISubscriptionInvoice {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    type: row.type as SubscriptionInvoiceTypeEnum,
    status: row.status as SubscriptionInvoiceStatusEnum,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.paymentMethod as PaymentMethodEnum | null,
    dueAt: row.dueAt,
    paidAt: row.paidAt,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    oasyfyTransactionId: row.oasyfyTransactionId,
    pixCode: row.pixCode,
    pixImageUrl: row.pixImageUrl,
    pixExpiresAt: row.pixExpiresAt,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    manualPaidReason: row.manualPaidReason,
    manualPaidByUserId: row.manualPaidByUserId,
    manualPaidAt: row.manualPaidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapWithPlan(row: {
  id: string;
  userId: string;
  planId: string;
  status: string;
  preferredPaymentMethod: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  dueAt: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null;
  stripeCustomerId: string | null;
  trialEndsAt: Date | null;
  trialGrantedAt: Date | null;
  trialGrantedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: string;
    name: string;
    priceMonthlyBrl: Prisma.Decimal;
    connectionsLimit: number;
    postsPerMonthLimit: number;
    features: Prisma.JsonValue;
  };
}): ISubscriptionWithPlan {
  return {
    ...mapSubscription(row),
    plan: {
      id: row.plan.id,
      name: row.plan.name,
      priceMonthlyBrl: Number(row.plan.priceMonthlyBrl),
      connectionsLimit: row.plan.connectionsLimit,
      postsPerMonthLimit: row.plan.postsPerMonthLimit,
      features: row.plan.features as Record<string, boolean>,
    },
  };
}

const subscriptionInclude = {
  plan: {
    select: {
      id: true,
      name: true,
      priceMonthlyBrl: true,
      connectionsLimit: true,
      postsPerMonthLimit: true,
      features: true,
    },
  },
} as const;

export class PrismaSubscriptionRepository
  extends BasePrismaRepository
  implements ISubscriptionRepository
{
  async findByUserId(userId: string): Promise<ISubscriptionWithPlan | null> {
    const row = await this.getPrismaClient().subscription.findUnique({
      where: { userId },
      include: subscriptionInclude,
    });

    return row ? mapWithPlan(row) : null;
  }

  async findById(id: string): Promise<ISubscriptionWithPlan | null> {
    const row = await this.getPrismaClient().subscription.findUnique({
      where: { id },
      include: subscriptionInclude,
    });

    return row ? mapWithPlan(row) : null;
  }

  async create(input: ICreateSubscriptionInput): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        status: SubscriptionStatusEnum.PENDING,
        preferredPaymentMethod: input.preferredPaymentMethod,
      },
    });

    return mapSubscription(row);
  }

  async updateStatus(
    id: string,
    status: SubscriptionStatusEnum,
  ): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: { status },
    });

    return mapSubscription(row);
  }

  async activateSubscription(
    id: string,
    input: {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      dueAt: Date;
      planId?: string;
    },
  ): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatusEnum.ACTIVE,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        dueAt: input.dueAt,
        gracePeriodEndsAt: null,
        ...(input.planId ? { planId: input.planId } : {}),
      },
    });

    return mapSubscription(row);
  }

  async setPastDue(id: string, gracePeriodEndsAt: Date): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatusEnum.PAST_DUE,
        gracePeriodEndsAt,
      },
    });

    return mapSubscription(row);
  }

  async setExpired(id: string): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatusEnum.EXPIRED,
        gracePeriodEndsAt: null,
      },
    });

    return mapSubscription(row);
  }

  async setCanceled(id: string): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatusEnum.CANCELED,
        cancelAtPeriodEnd: false,
        gracePeriodEndsAt: null,
      },
    });

    return mapSubscription(row);
  }

  async setCancelAtPeriodEnd(
    id: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd },
    });

    return mapSubscription(row);
  }

  async setScheduledPlanId(
    id: string,
    scheduledPlanId: string | null,
  ): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: { scheduledPlanId },
    });

    return mapSubscription(row);
  }

  async setStripeCustomerId(
    id: string,
    stripeCustomerId: string,
  ): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: { stripeCustomerId },
    });

    return mapSubscription(row);
  }

  async listForRenewalInvoiceGeneration(
    leadDays: number,
  ): Promise<ISubscriptionWithPlan[]> {
    const now = new Date();
    const leadDate = new Date(now);
    leadDate.setDate(leadDate.getDate() + leadDays);

    const rows = await this.getPrismaClient().subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.PAST_DUE],
        },
        currentPeriodEnd: { lte: leadDate },
        cancelAtPeriodEnd: false,
      },
      include: subscriptionInclude,
    });

    const eligible: ISubscriptionWithPlan[] = [];

    for (const row of rows) {
      const openRenewal = await this.findOpenRenewalInvoice(row.id);
      if (!openRenewal) {
        eligible.push(mapWithPlan(row));
      }
    }

    return eligible;
  }

  async listForOverdueProcessing(): Promise<ISubscriptionWithPlan[]> {
    const now = new Date();
    const rows = await this.getPrismaClient().subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.PAST_DUE],
        },
        dueAt: { lt: now },
      },
      include: subscriptionInclude,
    });

    return rows.map(mapWithPlan);
  }

  async listForExpiration(): Promise<ISubscriptionWithPlan[]> {
    const now = new Date();
    const rows = await this.getPrismaClient().subscription.findMany({
      where: {
        status: SubscriptionStatusEnum.PAST_DUE,
        gracePeriodEndsAt: { lt: now },
      },
      include: subscriptionInclude,
    });

    return rows.map(mapWithPlan);
  }

  async listForScheduledCancellation(): Promise<ISubscriptionWithPlan[]> {
    const now = new Date();
    const rows = await this.getPrismaClient().subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        status: {
          in: [SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.PAST_DUE],
        },
        currentPeriodEnd: { lt: now },
      },
      include: subscriptionInclude,
    });

    return rows.map(mapWithPlan);
  }

  async listForRenewalReminders(): Promise<
    Array<ISubscriptionWithPlan & { openInvoice: ISubscriptionInvoice }>
  > {
    const subscriptions = await this.getPrismaClient().subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.PAST_DUE],
        },
        dueAt: { not: null },
      },
      include: subscriptionInclude,
    });

    const result: Array<ISubscriptionWithPlan & { openInvoice: ISubscriptionInvoice }> =
      [];

    for (const row of subscriptions) {
      const openInvoice = await this.findOpenInvoiceBySubscriptionId(row.id);
      if (openInvoice) {
        result.push({
          ...mapWithPlan(row),
          openInvoice,
        });
      }
    }

    return result;
  }

  async listAdmin(filters: {
    status?: string;
    planId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ISubscriptionWithPlan[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.planId ? { planId: filters.planId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.getPrismaClient().subscription.findMany({
        where,
        include: subscriptionInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.getPrismaClient().subscription.count({ where }),
    ]);

    return {
      items: rows.map(mapWithPlan),
      total,
    };
  }

  async createInvoice(
    input: ICreateSubscriptionInvoiceInput,
  ): Promise<ISubscriptionInvoice> {
    const row = await this.getPrismaClient().subscriptionInvoice.create({
      data: {
        subscriptionId: input.subscriptionId,
        type: input.type,
        status: SubscriptionInvoiceStatusEnum.OPEN,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        dueAt: input.dueAt,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });

    return mapInvoice(row);
  }

  async findInvoiceById(id: string): Promise<ISubscriptionInvoice | null> {
    const row = await this.getPrismaClient().subscriptionInvoice.findUnique({
      where: { id },
    });

    return row ? mapInvoice(row) : null;
  }

  async findInvoiceByIdForUser(
    invoiceId: string,
    userId: string,
  ): Promise<ISubscriptionInvoice | null> {
    const row = await this.getPrismaClient().subscriptionInvoice.findFirst({
      where: {
        id: invoiceId,
        subscription: { userId },
      },
    });

    return row ? mapInvoice(row) : null;
  }

  async findOpenRenewalInvoice(
    subscriptionId: string,
  ): Promise<ISubscriptionInvoice | null> {
    const row = await this.getPrismaClient().subscriptionInvoice.findFirst({
      where: {
        subscriptionId,
        type: SubscriptionInvoiceTypeEnum.RENEWAL,
        status: {
          in: [
            SubscriptionInvoiceStatusEnum.OPEN,
            SubscriptionInvoiceStatusEnum.PENDING,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return row ? mapInvoice(row) : null;
  }

  async findOpenInvoiceBySubscriptionId(
    subscriptionId: string,
  ): Promise<ISubscriptionInvoice | null> {
    const row = await this.getPrismaClient().subscriptionInvoice.findFirst({
      where: {
        subscriptionId,
        status: {
          in: [
            SubscriptionInvoiceStatusEnum.OPEN,
            SubscriptionInvoiceStatusEnum.PENDING,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return row ? mapInvoice(row) : null;
  }

  async updateInvoiceAfterPixCreation(
    invoiceId: string,
    input: {
      oasyfyTransactionId: string;
      pixCode: string;
      pixImageUrl: string | null;
      pixExpiresAt: Date;
      status: SubscriptionInvoiceStatusEnum;
    },
  ): Promise<ISubscriptionInvoice> {
    const row = await this.getPrismaClient().subscriptionInvoice.update({
      where: { id: invoiceId },
      data: input,
    });

    return mapInvoice(row);
  }

  async updateInvoiceAfterStripeCheckout(
    invoiceId: string,
    input: {
      stripeCheckoutSessionId: string;
      status: SubscriptionInvoiceStatusEnum;
    },
  ): Promise<ISubscriptionInvoice> {
    const row = await this.getPrismaClient().subscriptionInvoice.update({
      where: { id: invoiceId },
      data: input,
    });

    return mapInvoice(row);
  }

  async markInvoicePaid(
    invoiceId: string,
    input?: {
      stripePaymentIntentId?: string;
      paidAt?: Date;
      manualPaidReason?: string;
      manualPaidByUserId?: string;
      manualPaidAt?: Date;
    },
  ): Promise<ISubscriptionInvoice> {
    const row = await this.getPrismaClient().subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: SubscriptionInvoiceStatusEnum.PAID,
        paidAt: input?.paidAt ?? new Date(),
        ...(input?.stripePaymentIntentId
          ? { stripePaymentIntentId: input.stripePaymentIntentId }
          : {}),
        ...(input?.manualPaidReason
          ? {
              manualPaidReason: input.manualPaidReason,
              manualPaidByUserId: input.manualPaidByUserId ?? null,
              manualPaidAt: input.manualPaidAt ?? new Date(),
            }
          : {}),
      },
    });

    return mapInvoice(row);
  }

  async cancelInvoice(invoiceId: string): Promise<ISubscriptionInvoice> {
    const row = await this.getPrismaClient().subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { status: SubscriptionInvoiceStatusEnum.CANCELED },
    });

    return mapInvoice(row);
  }

  async expireUnpaidPixInvoices(): Promise<ISubscriptionInvoice[]> {
    const now = new Date();
    const rows = await this.getPrismaClient().subscriptionInvoice.findMany({
      where: {
        status: {
          in: [
            SubscriptionInvoiceStatusEnum.OPEN,
            SubscriptionInvoiceStatusEnum.PENDING,
          ],
        },
        pixExpiresAt: { lt: now },
      },
    });

    const expired: ISubscriptionInvoice[] = [];

    for (const row of rows) {
      const updated = await this.getPrismaClient().subscriptionInvoice.update({
        where: { id: row.id },
        data: { status: SubscriptionInvoiceStatusEnum.EXPIRED },
      });
      expired.push(mapInvoice(updated));
    }

    return expired;
  }

  async countPostsInPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return this.getPrismaClient().publication.count({
      where: {
        userId,
        status: { in: Array.from(COUNTABLE_PUBLICATION_STATUSES) },
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  async countConnectedAccounts(userId: string): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count({
      where: {
        userId,
        status: "connected",
      },
    });
  }

  async createReminderLog(
    subscriptionId: string,
    invoiceId: string,
    daysBeforeDue: number,
  ): Promise<void> {
    await this.getPrismaClient().subscriptionReminderLog.create({
      data: {
        subscriptionId,
        invoiceId,
        daysBeforeDue,
      },
    });
  }

  async hasReminderLog(
    subscriptionId: string,
    invoiceId: string,
    daysBeforeDue: number,
  ): Promise<boolean> {
    const row = await this.getPrismaClient().subscriptionReminderLog.findUnique({
      where: {
        subscriptionId_invoiceId_daysBeforeDue: {
          subscriptionId,
          invoiceId,
          daysBeforeDue,
        },
      },
    });

    return Boolean(row);
  }

  async findInvoiceByOasyfyTransactionId(
    transactionId: string,
  ): Promise<ISubscriptionInvoice | null> {
    const row = await this.getPrismaClient().subscriptionInvoice.findFirst({
      where: { oasyfyTransactionId: transactionId },
    });

    return row ? mapInvoice(row) : null;
  }

  async findInvoiceByStripeCheckoutSessionId(
    sessionId: string,
  ): Promise<ISubscriptionInvoice | null> {
    const row = await this.getPrismaClient().subscriptionInvoice.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
    });

    return row ? mapInvoice(row) : null;
  }

  async listInvoicesBySubscriptionId(
    subscriptionId: string,
  ): Promise<ISubscriptionInvoice[]> {
    const rows = await this.getPrismaClient().subscriptionInvoice.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(mapInvoice);
  }

  async adminUpdateSubscription(
    id: string,
    input: Partial<{
      planId: string;
      status: SubscriptionStatusEnum;
      currentPeriodEnd: Date;
      dueAt: Date;
      cancelAtPeriodEnd: boolean;
    }>,
  ): Promise<ISubscription> {
    const row = await this.getPrismaClient().subscription.update({
      where: { id },
      data: input,
    });

    return mapSubscription(row);
  }

  async adminMarkInvoicePaid(invoiceId: string): Promise<ISubscriptionInvoice> {
    return this.markInvoicePaid(invoiceId);
  }

  async listOpenInvoicesByUserId(userId: string): Promise<ISubscriptionInvoice[]> {
    const subscription = await this.findByUserId(userId);

    if (!subscription) {
      return [];
    }

    const rows = await this.getPrismaClient().subscriptionInvoice.findMany({
      where: {
        subscriptionId: subscription.id,
        status: {
          in: [
            SubscriptionInvoiceStatusEnum.OPEN,
            SubscriptionInvoiceStatusEnum.PENDING,
          ],
        },
      },
      orderBy: { dueAt: "asc" },
    });

    return rows.map(mapInvoice);
  }

  async grantTrialSubscription(input: {
    userId: string;
    planId: string;
    grantedByUserId: string;
  }): Promise<ISubscriptionWithPlan> {
    const now = new Date();
    const trialData = {
      status: SubscriptionStatusEnum.TRIAL,
      planId: input.planId,
      trialEndsAt: null,
      trialGrantedAt: now,
      trialGrantedByUserId: input.grantedByUserId,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      dueAt: null,
      gracePeriodEndsAt: null,
      cancelAtPeriodEnd: false,
      scheduledPlanId: null,
    };

    const existing = await this.findByUserId(input.userId);

    if (!existing) {
      await this.getPrismaClient().subscription.create({
        data: {
          userId: input.userId,
          ...trialData,
        },
      });
    } else {
      await this.getPrismaClient().subscription.update({
        where: { id: existing.id },
        data: trialData,
      });
    }

    const subscription = await this.findByUserId(input.userId);

    if (!subscription) {
      throw new Error("Failed to grant trial subscription");
    }

    return subscription;
  }
}

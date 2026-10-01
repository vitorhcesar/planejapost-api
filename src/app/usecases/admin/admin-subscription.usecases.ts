import { ProcessSubscriptionInvoicePaymentUseCase } from "@/app/usecases/subscription/subscription.usecases";
import type { IBillingSettingsRepository } from "@/domain/repositories/billing-settings.repository";
import type { IOasyfyWebhookRepository } from "@/domain/repositories/oasyfy-webhook.repository";
import type { IStripeWebhookRepository } from "@/domain/repositories/stripe-webhook.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import { AppError } from "@/domain/errors/app.error";
import {
  PaymentMethodEnum,
  SubscriptionInvoiceStatusEnum,
  SubscriptionInvoiceTypeEnum,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";

export class ListAdminSubscriptionsUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(filters: {
    status?: string;
    planId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.subscriptionRepository.listAdmin(filters);
  }
}

export class GetAdminSubscriptionDetailsUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);

    if (!subscription) {
      throw new AppError("Assinatura não encontrada", 404, "subscription_not_found");
    }

    const invoices = await this.subscriptionRepository.listInvoicesBySubscriptionId(
      subscriptionId,
    );

    return { subscription, invoices };
  }
}

export class UpdateAdminSubscriptionUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(
    subscriptionId: string,
    input: Partial<{
      planId: string;
      status: SubscriptionStatusEnum;
      currentPeriodEnd: Date;
      dueAt: Date;
      cancelAtPeriodEnd: boolean;
    }>,
  ) {
    return this.subscriptionRepository.adminUpdateSubscription(subscriptionId, input);
  }
}

export class AdminMarkInvoicePaidUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly processInvoicePaymentUseCase: ProcessSubscriptionInvoicePaymentUseCase,
  ) {}

  async execute(
    invoiceId: string,
    input: { adminUserId: string; reason: string },
  ) {
    await this.processInvoicePaymentUseCase.execute(invoiceId, {
      manualPaidReason: input.reason,
      manualPaidByUserId: input.adminUserId,
    });

    const invoice = await this.subscriptionRepository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new AppError("Fatura não encontrada", 404, "invoice_not_found");
    }

    return invoice;
  }
}

export class AdminCancelInvoiceUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(invoiceId: string) {
    const invoice = await this.subscriptionRepository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new AppError("Fatura não encontrada", 404, "invoice_not_found");
    }

    if (invoice.status === SubscriptionInvoiceStatusEnum.PAID) {
      throw new AppError("Fatura já foi paga", 400, "invoice_not_payable");
    }

    return this.subscriptionRepository.cancelInvoice(invoiceId);
  }
}

export class AdminCreateManualInvoiceUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(
    subscriptionId: string,
    input: {
      amount: number;
      type?: SubscriptionInvoiceTypeEnum;
      paymentMethod?: PaymentMethodEnum;
      dueAt?: Date;
    },
  ) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);

    if (!subscription) {
      throw new AppError("Assinatura não encontrada", 404, "subscription_not_found");
    }

    const dueAt = input.dueAt ?? new Date();

    return this.subscriptionRepository.createInvoice({
      subscriptionId,
      type: input.type ?? SubscriptionInvoiceTypeEnum.RENEWAL,
      amount: input.amount,
      paymentMethod:
        input.paymentMethod ??
        subscription.preferredPaymentMethod ??
        PaymentMethodEnum.PIX,
      dueAt,
    });
  }
}

export class ListAdminOasyfyWebhooksUseCase {
  constructor(private readonly oasyfyWebhookRepository: IOasyfyWebhookRepository) {}

  async execute(filters: {
    event?: string;
    token?: string;
    receivedFrom?: Date;
    receivedTo?: Date;
    page?: number;
    limit?: number;
  }) {
    return this.oasyfyWebhookRepository.list(filters);
  }
}

export class ListAdminStripeWebhooksUseCase {
  constructor(private readonly stripeWebhookRepository: IStripeWebhookRepository) {}

  async execute(filters: {
    eventType?: string;
    page?: number;
    limit?: number;
  }) {
    return this.stripeWebhookRepository.list(filters);
  }
}

export class GetAdminBillingSettingsUseCase {
  constructor(private readonly billingSettingsRepository: IBillingSettingsRepository) {}

  async execute() {
    return this.billingSettingsRepository.getOrCreate();
  }
}

export class UpdateAdminBillingSettingsUseCase {
  constructor(private readonly billingSettingsRepository: IBillingSettingsRepository) {}

  async execute(input: {
    pixPaymentsEnabled?: boolean;
    cardPaymentsEnabled?: boolean;
    gracePeriodDays?: number;
    renewalReminderDays?: number[];
    invoiceGenerationLeadDays?: number;
  }) {
    return this.billingSettingsRepository.update(input);
  }
}

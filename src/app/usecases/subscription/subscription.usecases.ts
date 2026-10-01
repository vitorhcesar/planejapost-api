import type {
  IBillingSettingsDto,
  IPaymentMethodsDto,
  ISubscribeResultDto,
  ISubscriptionMeDto,
  ISubscriptionPlanDto,
} from "@/app/usecases/subscription/dto/subscription.dto";
import { ProvisionAccountSlotsUseCase } from "@/app/usecases/subscription/provision-account-slots.usecase";
import {
  assertConnectionsLimit,
  assertSubscriptionAllowsAccess,
} from "@/app/usecases/subscription/subscription-enforcement.util";
import { getPlanFeatureKeys } from "@/domain/constants/subscription-plan-features.util";
import type { IOasyfyService } from "@/domain/acquirer/oasyfy.service";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import {
  PaymentMethodEnum,
  SubscriptionInvoiceStatusEnum,
  SubscriptionInvoiceTypeEnum,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";
import { AppError } from "@/domain/errors/app.error";
import type { IBillingSettingsRepository } from "@/domain/repositories/billing-settings.repository";
import type { ISubscriptionPlanRepository } from "@/domain/repositories/subscription-plan.repository";
import type {
  ISubscriptionInvoice,
  ISubscriptionRepository,
  ISubscriptionWithPlan,
} from "@/domain/repositories/subscription.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IStripeService } from "@/infra/stripe/stripe.client";

const PIX_EXPIRATION_HOURS = 24;

export class ListSubscriptionPlansUseCase {
  constructor(
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
  ) {}

  async execute(): Promise<ISubscriptionPlanDto[]> {
    const plans = await this.subscriptionPlanRepository.findAllActive();

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceMonthlyBrl: plan.priceMonthlyBrl,
      connectionsLimit: plan.connectionsLimit,
      postsPerMonthLimit: plan.postsPerMonthLimit,
      features: getPlanFeatureKeys(plan.features),
      sortOrder: plan.sortOrder,
    }));
  }
}

export class GetPaymentMethodsUseCase {
  constructor(
    private readonly billingSettingsRepository: IBillingSettingsRepository,
  ) {}

  async execute(): Promise<IPaymentMethodsDto> {
    const settings = await this.billingSettingsRepository.getOrCreate();

    return {
      pix: settings.pixPaymentsEnabled,
      card: settings.cardPaymentsEnabled,
    };
  }
}

export class GetBillingSettingsUseCase {
  constructor(
    private readonly billingSettingsRepository: IBillingSettingsRepository,
  ) {}

  async execute(): Promise<IBillingSettingsDto> {
    const settings = await this.billingSettingsRepository.getOrCreate();
    return settings;
  }
}

export class UpdateBillingSettingsUseCase {
  constructor(
    private readonly billingSettingsRepository: IBillingSettingsRepository,
  ) {}

  async execute(input: Partial<IBillingSettingsDto>): Promise<IBillingSettingsDto> {
    return this.billingSettingsRepository.update(input);
  }
}

export class GetMySubscriptionUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<ISubscriptionMeDto> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      return {
        subscription: null,
        usage: null,
        openInvoice: null,
        features: [],
      };
    }

    const [connectionsUsed, postsUsed, openInvoice] = await Promise.all([
      this.subscriptionRepository.countConnectedAccounts(userId),
      subscription.currentPeriodStart && subscription.currentPeriodEnd
        ? this.subscriptionRepository.countPostsInPeriod(
            userId,
            subscription.currentPeriodStart,
            subscription.currentPeriodEnd,
          )
        : Promise.resolve(0),
      this.subscriptionRepository.findOpenInvoiceBySubscriptionId(subscription.id),
    ]);

    return {
      subscription: {
        planId: subscription.planId,
        planName: subscription.plan.name,
        status: subscription.status,
        preferredPaymentMethod: subscription.preferredPaymentMethod,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        dueAt: subscription.dueAt?.toISOString() ?? null,
        gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        scheduledPlanId: subscription.scheduledPlanId,
      },
      usage: {
        connectionsUsed,
        connectionsLimit: subscription.plan.connectionsLimit,
        postsUsed,
        postsPerMonthLimit: subscription.plan.postsPerMonthLimit,
      },
      openInvoice: openInvoice
        ? {
            id: openInvoice.id,
            amount: openInvoice.amount,
            dueAt: openInvoice.dueAt.toISOString(),
            status: openInvoice.status,
          }
        : null,
      features: getPlanFeatureKeys(
        subscription.plan.features as unknown as Parameters<
          typeof getPlanFeatureKeys
        >[0],
      ),
    };
  }
}

export class SubscribeToPlanUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    private readonly billingSettingsRepository: IBillingSettingsRepository,
    private readonly userRepository: IUserRepository,
    private readonly oasyfyService: IOasyfyService,
    private readonly stripeService: IStripeService,
    private readonly publicApiConfig: IPublicApiConfig,
    private readonly frontendOrigin: string,
  ) {}

  async execute(input: {
    userId: string;
    planId: string;
    paymentMethod: PaymentMethodEnum;
    client?: { phone: string; document: string };
  }): Promise<ISubscribeResultDto> {
    await this.assertPaymentMethodEnabled(input.paymentMethod);

    const plan = await this.subscriptionPlanRepository.findById(input.planId);

    if (!plan || !plan.isActive) {
      throw new AppError("Plano inválido", 400, "invalid_plan");
    }

    const existing = await this.subscriptionRepository.findByUserId(input.userId);

    if (
      existing &&
      [SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.PAST_DUE].includes(
        existing.status,
      )
    ) {
      throw new AppError(
        "Usuário já possui assinatura ativa",
        400,
        "subscription_already_active",
      );
    }

    if (!existing) {
      await this.subscriptionRepository.create({
        userId: input.userId,
        planId: input.planId,
        preferredPaymentMethod: input.paymentMethod,
      });
    } else {
      await this.subscriptionRepository.adminUpdateSubscription(existing.id, {
        planId: input.planId,
        status: SubscriptionStatusEnum.PENDING,
      });
    }

    const subscription = await this.subscriptionRepository.findByUserId(input.userId);

    if (!subscription) {
      throw new AppError("Falha ao criar assinatura", 500, "subscription_create_failed");
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);

    const invoice = await this.subscriptionRepository.createInvoice({
      subscriptionId: subscription.id,
      type: SubscriptionInvoiceTypeEnum.INITIAL,
      amount: plan.priceMonthlyBrl,
      paymentMethod: input.paymentMethod,
      dueAt,
    });

    if (input.paymentMethod === PaymentMethodEnum.PIX) {
      return this.createPixPayment(input.userId, subscription.id, invoice, input.client);
    }

    return this.createStripeCheckout(input.userId, subscription, invoice, plan.name);
  }

  private async createPixPayment(
    userId: string,
    subscriptionId: string,
    invoice: ISubscriptionInvoice,
    client?: { phone: string; document: string },
  ): Promise<ISubscribeResultDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

 if (!client?.phone || !client?.document) {
      throw new AppError(
        "Telefone e documento são obrigatórios para pagamento PIX",
        400,
        "pix_client_required",
      );
    }

    const identifier = `sub_${invoice.id.replace(/-/g, "")}`;
    const pixResult = await this.oasyfyService.receivePix({
      identifier,
      amount: invoice.amount,
      client: {
        name: user.name,
        email: user.email,
        phone: client.phone,
        document: client.document,
      },
      metadata: {
        type: "subscription_invoice",
        subscriptionInvoiceId: invoice.id,
        userId,
        subscriptionId,
      },
      callbackUrl: `${this.publicApiConfig.publicApiUrl}/api/v1/webhooks/oasyfy`,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PIX_EXPIRATION_HOURS);

    await this.subscriptionRepository.updateInvoiceAfterPixCreation(invoice.id, {
      oasyfyTransactionId: pixResult.transactionId,
      pixCode: pixResult.pix.code,
      pixImageUrl: pixResult.pix.image ?? null,
      pixExpiresAt: expiresAt,
      status: SubscriptionInvoiceStatusEnum.PENDING,
    });

    return {
      subscriptionId,
      invoiceId: invoice.id,
      amount: invoice.amount,
      pixCode: pixResult.pix.code,
      pixImageUrl: pixResult.pix.image ?? null,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async createStripeCheckout(
    userId: string,
    subscription: ISubscriptionWithPlan,
    invoice: ISubscriptionInvoice,
    planName: string,
  ): Promise<ISubscribeResultDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const checkout = await this.stripeService.createCheckoutSession({
      invoiceId: invoice.id,
      userId,
      amount: invoice.amount,
      planName,
      customerEmail: user.email,
      successUrl: `${this.frontendOrigin}/subscription/billing?payment=success`,
      cancelUrl: `${this.frontendOrigin}/pricing/${subscription.planId}?payment=canceled`,
      stripeCustomerId: subscription.stripeCustomerId,
    });

    await this.subscriptionRepository.updateInvoiceAfterStripeCheckout(invoice.id, {
      stripeCheckoutSessionId: checkout.sessionId,
      status: SubscriptionInvoiceStatusEnum.PENDING,
    });

    return {
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      amount: invoice.amount,
      checkoutUrl: checkout.checkoutUrl,
    };
  }

  private async assertPaymentMethodEnabled(method: PaymentMethodEnum): Promise<void> {
    const settings = await this.billingSettingsRepository.getOrCreate();

    if (!settings.pixPaymentsEnabled && !settings.cardPaymentsEnabled) {
      throw new AppError(
        "Nenhum método de pagamento disponível",
        503,
        "billing_unavailable",
      );
    }

    if (method === PaymentMethodEnum.PIX && !settings.pixPaymentsEnabled) {
      throw new AppError("Pagamento PIX desabilitado", 400, "payment_method_disabled");
    }

    if (method === PaymentMethodEnum.CARD && !settings.cardPaymentsEnabled) {
      throw new AppError("Pagamento com cartão desabilitado", 400, "payment_method_disabled");
    }
  }
}

export class PaySubscriptionInvoiceUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly userRepository: IUserRepository,
    private readonly oasyfyService: IOasyfyService,
    private readonly stripeService: IStripeService,
    private readonly billingSettingsRepository: IBillingSettingsRepository,
    private readonly publicApiConfig: IPublicApiConfig,
    private readonly frontendOrigin: string,
  ) {}

  async execute(input: {
    userId: string;
    invoiceId: string;
    paymentMethod: PaymentMethodEnum;
    client?: { phone: string; document: string };
  }): Promise<ISubscribeResultDto> {
    const invoice = await this.subscriptionRepository.findInvoiceByIdForUser(
      input.invoiceId,
      input.userId,
    );

    if (!invoice) {
      throw new AppError("Fatura não encontrada", 404, "invoice_not_found");
    }

    if (
      ![SubscriptionInvoiceStatusEnum.OPEN, SubscriptionInvoiceStatusEnum.PENDING].includes(
        invoice.status,
      )
    ) {
      throw new AppError("Fatura não pode ser paga", 400, "invoice_not_payable");
    }

    const subscription = await this.subscriptionRepository.findByUserId(input.userId);

    if (!subscription) {
      throw new AppError("Assinatura não encontrada", 404, "subscription_not_found");
    }

    const settings = await this.billingSettingsRepository.getOrCreate();

    if (input.paymentMethod === PaymentMethodEnum.PIX && !settings.pixPaymentsEnabled) {
      throw new AppError("Pagamento PIX desabilitado", 400, "payment_method_disabled");
    }

    if (input.paymentMethod === PaymentMethodEnum.CARD && !settings.cardPaymentsEnabled) {
      throw new AppError("Pagamento com cartão desabilitado", 400, "payment_method_disabled");
    }

    if (input.paymentMethod === PaymentMethodEnum.PIX) {
      const user = await this.userRepository.findById(input.userId);
      if (!user) throw new AppError("Usuário não encontrado", 404, "user_not_found");
      if (!input.client?.phone || !input.client?.document) {
        throw new AppError("Telefone e documento são obrigatórios", 400, "pix_client_required");
      }

      const identifier = `sub_${invoice.id.replace(/-/g, "")}`;
      const pixResult = await this.oasyfyService.receivePix({
        identifier,
        amount: invoice.amount,
        client: {
          name: user.name,
          email: user.email,
          phone: input.client.phone,
          document: input.client.document,
        },
        metadata: {
          type: "subscription_invoice",
          subscriptionInvoiceId: invoice.id,
          userId: input.userId,
          subscriptionId: subscription.id,
        },
        callbackUrl: `${this.publicApiConfig.publicApiUrl}/api/v1/webhooks/oasyfy`,
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + PIX_EXPIRATION_HOURS);

      await this.subscriptionRepository.updateInvoiceAfterPixCreation(invoice.id, {
        oasyfyTransactionId: pixResult.transactionId,
        pixCode: pixResult.pix.code,
        pixImageUrl: pixResult.pix.image ?? null,
        pixExpiresAt: expiresAt,
        status: SubscriptionInvoiceStatusEnum.PENDING,
      });

      return {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amount: invoice.amount,
        pixCode: pixResult.pix.code,
        pixImageUrl: pixResult.pix.image ?? null,
        expiresAt: expiresAt.toISOString(),
      };
    }

    const checkout = await this.stripeService.createCheckoutSession({
      invoiceId: invoice.id,
      userId: input.userId,
      amount: invoice.amount,
      planName: subscription.plan.name,
      customerEmail: (await this.userRepository.findById(input.userId))!.email,
      successUrl: `${this.frontendOrigin}/subscription/billing?payment=success`,
      cancelUrl: `${this.frontendOrigin}/subscription/billing?payment=canceled`,
      stripeCustomerId: subscription.stripeCustomerId,
    });

    await this.subscriptionRepository.updateInvoiceAfterStripeCheckout(invoice.id, {
      stripeCheckoutSessionId: checkout.sessionId,
      status: SubscriptionInvoiceStatusEnum.PENDING,
    });

    return {
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      amount: invoice.amount,
      checkoutUrl: checkout.checkoutUrl,
    };
  }
}

export class CancelSubscriptionUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    assertSubscriptionAllowsAccess(subscription);

    await this.subscriptionRepository.setCancelAtPeriodEnd(subscription!.id, true);
  }
}

export class ChangeSubscriptionPlanUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
  ) {}

  async execute(input: { userId: string; planId: string }): Promise<void> {
    const subscription = await this.subscriptionRepository.findByUserId(input.userId);
    const activeSubscription = assertSubscriptionAllowsAccess(subscription);

    const newPlan = await this.subscriptionPlanRepository.findById(input.planId);

    if (!newPlan || !newPlan.isActive) {
      throw new AppError("Plano inválido", 400, "invalid_plan");
    }

    const currentPlan = await this.subscriptionPlanRepository.findById(
      activeSubscription.planId,
    );

    if (!currentPlan) {
      throw new AppError("Plano atual não encontrado", 400, "invalid_plan");
    }

    if (newPlan.sortOrder > currentPlan.sortOrder) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 3);

      await this.subscriptionRepository.createInvoice({
        subscriptionId: activeSubscription.id,
        type: SubscriptionInvoiceTypeEnum.UPGRADE,
        amount: newPlan.priceMonthlyBrl,
        paymentMethod: activeSubscription.preferredPaymentMethod ?? PaymentMethodEnum.PIX,
        dueAt,
      });
      return;
    }

    const connectionsUsed = await this.subscriptionRepository.countConnectedAccounts(
      input.userId,
    );

    if (connectionsUsed > newPlan.connectionsLimit) {
      throw new AppError(
        "Desconecte contas antes de fazer downgrade",
        400,
        "downgrade_connections_exceeded",
      );
    }

    await this.subscriptionRepository.setScheduledPlanId(
      activeSubscription.id,
      newPlan.id,
    );
  }
}

export class ProcessSubscriptionInvoicePaymentUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    private readonly provisionAccountSlotsUseCase: ProvisionAccountSlotsUseCase,
  ) {}

  async execute(invoiceId: string): Promise<void> {
    const invoice = await this.subscriptionRepository.findInvoiceById(invoiceId);

    if (!invoice || invoice.status === SubscriptionInvoiceStatusEnum.PAID) {
      return;
    }

    await this.subscriptionRepository.markInvoicePaid(invoiceId);

    const subscription = await this.subscriptionRepository.findById(
      invoice.subscriptionId,
    );

    if (!subscription) {
      return;
    }

    const now = new Date();
    const periodStart = invoice.periodStart ?? now;
    const periodEnd = invoice.periodEnd ?? addMonths(periodStart, 1);

    let planId = subscription.planId;

    if (invoice.type === SubscriptionInvoiceTypeEnum.UPGRADE) {
      const upgradePlan = await this.findUpgradePlan(subscription);
      if (upgradePlan) {
        planId = upgradePlan.id;
      }
    } else if (subscription.scheduledPlanId) {
      planId = subscription.scheduledPlanId;
      await this.subscriptionRepository.setScheduledPlanId(subscription.id, null);
    }

    await this.subscriptionRepository.activateSubscription(subscription.id, {
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      dueAt: periodEnd,
      planId,
    });

    const updated = await this.subscriptionRepository.findById(subscription.id);

    if (updated) {
      await this.provisionAccountSlotsUseCase.execute(
        updated.userId,
        updated.plan.connectionsLimit,
      );
    }
  }

  private async findUpgradePlan(subscription: ISubscriptionWithPlan) {
    const openUpgrade = await this.subscriptionRepository.findOpenInvoiceBySubscriptionId(
      subscription.id,
    );

    if (!openUpgrade || openUpgrade.type !== SubscriptionInvoiceTypeEnum.UPGRADE) {
      return null;
    }

    const plans = await this.subscriptionPlanRepository.findAllActive();
    return plans.find((plan) => plan.priceMonthlyBrl === openUpgrade.amount) ?? null;
  }
}

export class AssertSubscriptionForPublishUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<ISubscriptionWithPlan> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    const activeSubscription = assertSubscriptionAllowsAccess(subscription);

    const postsUsed =
      activeSubscription.currentPeriodStart && activeSubscription.currentPeriodEnd
        ? await this.subscriptionRepository.countPostsInPeriod(
            userId,
            activeSubscription.currentPeriodStart,
            activeSubscription.currentPeriodEnd,
          )
        : 0;

    if (postsUsed >= activeSubscription.plan.postsPerMonthLimit) {
      throw new AppError(
        "Limite mensal de publicações atingido",
        403,
        "posts_limit_reached",
      );
    }

    return activeSubscription;
  }
}

export class AssertSubscriptionForConnectUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<ISubscriptionWithPlan> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    const activeSubscription = assertSubscriptionAllowsAccess(subscription);

    const connectionsUsed =
      await this.subscriptionRepository.countConnectedAccounts(userId);
    assertConnectionsLimit(activeSubscription, connectionsUsed);

    return activeSubscription;
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

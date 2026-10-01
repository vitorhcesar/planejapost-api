import { ProvisionAccountSlotsUseCase } from "@/app/usecases/subscription/provision-account-slots.usecase";
import { ProcessSubscriptionInvoicePaymentUseCase } from "@/app/usecases/subscription/subscription.usecases";
import { SubscriptionEmailService } from "@/app/usecases/subscription/subscription-email.service";
import {
  PaymentMethodEnum,
  SubscriptionInvoiceStatusEnum,
  SubscriptionInvoiceTypeEnum,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";
import type { IBillingSettingsRepository } from "@/domain/repositories/billing-settings.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import type { IEmailService } from "@/domain/services/email.service";
import type { ILogger } from "@/domain/services/logger.service";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";

const JOB_SCOPE = "SubscriptionJobs";

export class GenerateRenewalInvoicesJob {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly billingSettingsRepository: IBillingSettingsRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(): Promise<void> {
    const settings = await this.billingSettingsRepository.getOrCreate();
    const subscriptions = await this.subscriptionRepository.listForRenewalInvoiceGeneration(
      settings.invoiceGenerationLeadDays,
    );

    for (const subscription of subscriptions) {
      if (!subscription.currentPeriodEnd) {
        continue;
      }

      await this.subscriptionRepository.createInvoice({
        subscriptionId: subscription.id,
        type: SubscriptionInvoiceTypeEnum.RENEWAL,
        amount: subscription.plan.priceMonthlyBrl,
        paymentMethod:
          subscription.preferredPaymentMethod ?? PaymentMethodEnum.PIX,
        dueAt: subscription.currentPeriodEnd,
        periodStart: subscription.currentPeriodEnd,
        periodEnd: addMonths(subscription.currentPeriodEnd, 1),
      });

      this.logger.info(JOB_SCOPE, "Fatura de renovação criada", {
        subscriptionId: subscription.id,
      });
    }
  }

}

export class SendRenewalReminderEmailsJob {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly billingSettingsRepository: IBillingSettingsRepository,
    private readonly userRepository: IUserRepository,
    private readonly emailService: SubscriptionEmailService,
    private readonly logger: ILogger,
  ) {}

  async execute(): Promise<void> {
    const settings = await this.billingSettingsRepository.getOrCreate();
    const subscriptions = await this.subscriptionRepository.listForRenewalReminders();
    const now = new Date();

    for (const item of subscriptions) {
      if (!item.dueAt) {
        continue;
      }

      const daysUntilDue = Math.ceil(
        (item.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (!settings.renewalReminderDays.includes(daysUntilDue)) {
        continue;
      }

      const alreadySent = await this.subscriptionRepository.hasReminderLog(
        item.id,
        item.openInvoice.id,
        daysUntilDue,
      );

      if (alreadySent) {
        continue;
      }

      const user = await this.userRepository.findById(item.userId);

      if (!user) {
        continue;
      }

      await this.emailService.sendRenewalReminder({
        to: user.email,
        planName: item.plan.name,
        amount: item.openInvoice.amount,
        dueAt: item.dueAt,
        daysBeforeDue: daysUntilDue,
      });

      await this.subscriptionRepository.createReminderLog(
        item.id,
        item.openInvoice.id,
        daysUntilDue,
      );

      this.logger.info(JOB_SCOPE, "Lembrete de renovação enviado", {
        subscriptionId: item.id,
        daysUntilDue,
      });
    }
  }
}

export class ProcessOverdueSubscriptionsJob {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly billingSettingsRepository: IBillingSettingsRepository,
    private readonly expireSubscriptionUseCase: ExpireSubscriptionForNonPaymentUseCase,
    private readonly emailService: SubscriptionEmailService,
    private readonly userRepository: IUserRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(): Promise<void> {
    const settings = await this.billingSettingsRepository.getOrCreate();
    const overdue = await this.subscriptionRepository.listForOverdueProcessing();
    const now = new Date();

    for (const subscription of overdue) {
      const openInvoice = await this.subscriptionRepository.findOpenInvoiceBySubscriptionId(
        subscription.id,
      );

      if (!openInvoice) {
        continue;
      }

      if (subscription.status === SubscriptionStatusEnum.ACTIVE) {
        const gracePeriodEndsAt = new Date(subscription.dueAt ?? now);
        gracePeriodEndsAt.setDate(
          gracePeriodEndsAt.getDate() + settings.gracePeriodDays,
        );

        await this.subscriptionRepository.setPastDue(
          subscription.id,
          gracePeriodEndsAt,
        );

        const user = await this.userRepository.findById(subscription.userId);

        if (user) {
          await this.emailService.sendPastDueNotice({
            to: user.email,
            planName: subscription.plan.name,
            gracePeriodDays: settings.gracePeriodDays,
          });
        }

        this.logger.info(JOB_SCOPE, "Assinatura marcada como past_due", {
          subscriptionId: subscription.id,
        });
      }
    }

    const toExpire = await this.subscriptionRepository.listForExpiration();

    for (const subscription of toExpire) {
      const openInvoice = await this.subscriptionRepository.findOpenInvoiceBySubscriptionId(
        subscription.id,
      );

      if (openInvoice) {
        await this.expireSubscriptionUseCase.execute(subscription.id);
      }
    }
  }
}

export class ExpireUnpaidPixInvoicesJob {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(): Promise<void> {
    const expired = await this.subscriptionRepository.expireUnpaidPixInvoices();

    for (const invoice of expired) {
      this.logger.info(JOB_SCOPE, "Fatura PIX expirada", {
        invoiceId: invoice.id,
      });
    }
  }
}

export class ExpireSubscriptionForNonPaymentUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly provisionAccountSlotsUseCase: ProvisionAccountSlotsUseCase,
    private readonly zernioAccountService: IZernioAccountService,
    private readonly userRepository: IUserRepository,
    private readonly emailService: SubscriptionEmailService,
    private readonly logger: ILogger,
  ) {}

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);

    if (!subscription) {
      return;
    }

    await this.subscriptionRepository.setExpired(subscriptionId);

    const accounts = await this.socialConnectedAccountRepository.findByUserId(
      subscription.userId,
    );

    for (const account of accounts.filter((item) => item.status === "connected")) {
      try {
        await this.zernioAccountService.disconnectAccount(account.zernioAccountId);
      } catch (error) {
        this.logger.error(
          JOB_SCOPE,
          "Falha ao desconectar conta na Zernio",
          error,
          { accountId: account.id },
        );
      }

      account.markAsDisconnected();
      await this.socialConnectedAccountRepository.save(account);
    }

    await this.provisionAccountSlotsUseCase.releaseAll(subscription.userId);

    const user = await this.userRepository.findById(subscription.userId);

    if (user) {
      await this.emailService.sendExpiredNotice({
        to: user.email,
        planName: subscription.plan.name,
      });
    }

    this.logger.info(JOB_SCOPE, "Assinatura expirada e contas desconectadas", {
      subscriptionId,
      userId: subscription.userId,
    });
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

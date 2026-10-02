import type {
  IAdminUserDetailDto,
  IAdminUserOpenInvoiceDto,
  IAdminUserSubscriptionSummaryDto,
} from "@/app/usecases/admin/dto/admin-user-detail.dto";
import { ProcessSubscriptionInvoicePaymentUseCase } from "@/app/usecases/subscription/subscription.usecases";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";
import { AppError } from "@/domain/errors/app.error";
import type { ISubscriptionPlanRepository } from "@/domain/repositories/subscription-plan.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import {
  SubscriptionInvoiceStatusEnum,
} from "@/domain/enums/subscription.enum";

function mapSubscriptionSummary(
  subscription: NonNullable<Awaited<ReturnType<ISubscriptionRepository["findByUserId"]>>>,
): IAdminUserSubscriptionSummaryDto {
  return {
    id: subscription.id,
    planId: subscription.planId,
    planName: subscription.plan.name,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    trialGrantedAt: subscription.trialGrantedAt?.toISOString() ?? null,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    dueAt: subscription.dueAt?.toISOString() ?? null,
  };
}

function mapOpenInvoice(invoice: {
  id: string;
  subscriptionId: string;
  type: string;
  status: string;
  amount: number;
  dueAt: Date;
  createdAt: Date;
  manualPaidReason: string | null;
  manualPaidAt: Date | null;
}): IAdminUserOpenInvoiceDto {
  return {
    id: invoice.id,
    subscriptionId: invoice.subscriptionId,
    type: invoice.type,
    status: invoice.status,
    amount: invoice.amount,
    dueAt: invoice.dueAt.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    manualPaidReason: invoice.manualPaidReason,
    manualPaidAt: invoice.manualPaidAt?.toISOString() ?? null,
  };
}

export class GetAdminUserDetailUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(userId: string): Promise<IAdminUserDetailDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const [socialAccountsCount, publicationsCount, workspacesCount, subscription, openInvoices] =
      await Promise.all([
        this.userRepository.countSocialAccountsByUserId(userId),
        this.userRepository.countPublicationsByUserId(userId),
        this.userRepository.countWorkspacesByUserId(userId),
        this.subscriptionRepository.findByUserId(userId),
        this.subscriptionRepository.listOpenInvoicesByUserId(userId),
      ]);

    return {
      user: mapUserToDto(user),
      metrics: {
        socialAccountsCount,
        publicationsCount,
        workspacesCount,
      },
      subscription: subscription ? mapSubscriptionSummary(subscription) : null,
      openInvoices: openInvoices.map(mapOpenInvoice),
    };
  }
}

export class GrantAdminTrialSubscriptionUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(input: {
    userId: string;
    planId: string;
    grantedByUserId: string;
  }): Promise<IAdminUserSubscriptionSummaryDto> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const plan = await this.subscriptionPlanRepository.findById(input.planId);

    if (!plan || !plan.isActive) {
      throw new AppError("Plano inválido", 400, "invalid_plan");
    }

    const subscription = await this.subscriptionRepository.grantTrialSubscription({
      userId: input.userId,
      planId: input.planId,
      grantedByUserId: input.grantedByUserId,
    });

    return mapSubscriptionSummary(subscription);
  }
}

export class AdminMarkUserInvoicePaidUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly processInvoicePaymentUseCase: ProcessSubscriptionInvoicePaymentUseCase,
  ) {}

  async execute(input: {
    userId: string;
    invoiceId: string;
    adminUserId: string;
    reason: string;
  }) {
    const invoice = await this.subscriptionRepository.findInvoiceById(input.invoiceId);

    if (!invoice) {
      throw new AppError("Fatura não encontrada", 404, "invoice_not_found");
    }

    const subscription = await this.subscriptionRepository.findById(invoice.subscriptionId);

    if (!subscription || subscription.userId !== input.userId) {
      throw new AppError("Fatura não encontrada", 404, "invoice_not_found");
    }

    if (invoice.status === SubscriptionInvoiceStatusEnum.PAID) {
      return invoice;
    }

    await this.processInvoicePaymentUseCase.execute(input.invoiceId, {
      manualPaidReason: input.reason,
      manualPaidByUserId: input.adminUserId,
    });

    const updated = await this.subscriptionRepository.findInvoiceById(input.invoiceId);

    if (!updated) {
      throw new AppError("Fatura não encontrada", 404, "invoice_not_found");
    }

    return updated;
  }
}

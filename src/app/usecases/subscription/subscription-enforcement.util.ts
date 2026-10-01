import {
  hasPlanFeature,
  type ISubscriptionPlanFeatures,
} from "@/domain/constants/subscription-plan-features.util";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";
import { AppError } from "@/domain/errors/app.error";
import type { ISubscriptionWithPlan } from "@/domain/repositories/subscription.repository";

export function assertSubscriptionAllowsAccess(
  subscription: ISubscriptionWithPlan | null,
): ISubscriptionWithPlan {
  if (!subscription) {
    throw new AppError(
      "Assinatura ativa necessária para esta operação",
      403,
      "subscription_required",
    );
  }

  if (subscription.status === SubscriptionStatusEnum.EXPIRED) {
    throw new AppError("Assinatura expirada", 403, "subscription_expired");
  }

  if (subscription.status === SubscriptionStatusEnum.CANCELED) {
    throw new AppError("Assinatura cancelada", 403, "subscription_expired");
  }

  if (subscription.status === SubscriptionStatusEnum.PENDING) {
    throw new AppError(
      "Assinatura ativa necessária para esta operação",
      403,
      "subscription_required",
    );
  }

  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    throw new AppError(
      "Assinatura ativa necessária para esta operação",
      403,
      "subscription_required",
    );
  }

  if (
    subscription.status === SubscriptionStatusEnum.PAST_DUE &&
    subscription.gracePeriodEndsAt &&
    subscription.gracePeriodEndsAt.getTime() < Date.now()
  ) {
    throw new AppError("Assinatura em atraso", 403, "subscription_past_due");
  }

  return subscription;
}

export function assertConnectionsLimit(
  subscription: ISubscriptionWithPlan,
  connectionsUsed: number,
): void {
  if (connectionsUsed >= subscription.plan.connectionsLimit) {
    throw new AppError(
      "Limite de conexões do plano atingido",
      403,
      "connections_limit_reached",
    );
  }
}

export function assertPostsLimit(
  subscription: ISubscriptionWithPlan,
  postsUsed: number,
): void {
  if (postsUsed >= subscription.plan.postsPerMonthLimit) {
    throw new AppError(
      "Limite mensal de publicações atingido",
      403,
      "posts_limit_reached",
    );
  }
}

export function assertPlanFeature(
  subscription: ISubscriptionWithPlan,
  feature: keyof ISubscriptionPlanFeatures,
): void {
  const features = subscription.plan.features as unknown as ISubscriptionPlanFeatures;

  if (!hasPlanFeature(features, feature)) {
    throw new AppError(
      "Recurso não disponível no seu plano",
      403,
      "plan_feature_not_available",
    );
  }
}

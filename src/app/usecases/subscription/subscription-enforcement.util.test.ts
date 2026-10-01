import { describe, expect, it } from "bun:test";
import {
  assertPlanFeature,
  assertSubscriptionAllowsAccess,
} from "@/app/usecases/subscription/subscription-enforcement.util";
import { SubscriptionStatusEnum } from "@/domain/enums/subscription.enum";
import type { ISubscriptionWithPlan } from "@/domain/repositories/subscription.repository";

function createSubscription(
  overrides: Partial<ISubscriptionWithPlan> = {},
): ISubscriptionWithPlan {
  return {
    id: "sub_1",
    userId: "user_1",
    planId: "growth",
    status: SubscriptionStatusEnum.ACTIVE,
    preferredPaymentMethod: null,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    dueAt: new Date(),
    gracePeriodEndsAt: null,
    cancelAtPeriodEnd: false,
    scheduledPlanId: null,
    stripeCustomerId: null,
    trialEndsAt: null,
    trialGrantedAt: null,
    trialGrantedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: {
      id: "growth",
      name: "Crescimento",
      priceMonthlyBrl: 179,
      connectionsLimit: 10,
      postsPerMonthLimit: 1800,
      features: {
        scheduling: true,
        support_chat: true,
        multi_platform: true,
        carousel_editor: false,
        ai_captions: false,
        basic_reports: false,
        publish_priority: false,
        facebook_business_portfolio: false,
      },
    },
    ...overrides,
  };
}

describe("subscription-enforcement.util", () => {
  it("allows active subscriptions", () => {
    const subscription = createSubscription();

    expect(assertSubscriptionAllowsAccess(subscription).id).toBe("sub_1");
  });

  it("allows trial subscriptions", () => {
    const subscription = createSubscription({
      status: SubscriptionStatusEnum.TRIAL,
      dueAt: null,
      currentPeriodEnd: null,
    });

    expect(assertSubscriptionAllowsAccess(subscription).id).toBe("sub_1");
  });

  it("blocks unavailable plan features", () => {
    const subscription = createSubscription();

    expect(() => assertPlanFeature(subscription, "carousel_editor")).toThrow(
      "Recurso não disponível no seu plano",
    );
  });

  it("allows enabled plan features", () => {
    const subscription = createSubscription({
      plan: {
        ...createSubscription().plan,
        features: {
          ...createSubscription().plan.features,
          carousel_editor: true,
        },
      },
    });

    expect(() => assertPlanFeature(subscription, "carousel_editor")).not.toThrow();
  });
});

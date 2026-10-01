import type { ISubscriptionPlanFeatures } from "@/domain/constants/subscription-plan-features.util";

export interface ISubscriptionPlan {
  id: string;
  name: string;
  priceMonthlyBrl: number;
  connectionsLimit: number;
  postsPerMonthLimit: number;
  features: ISubscriptionPlanFeatures;
  stripePriceId: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ISubscriptionPlanRepository {
  findAllActive(): Promise<ISubscriptionPlan[]>;
  findById(id: string): Promise<ISubscriptionPlan | null>;
}

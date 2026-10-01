export interface ISubscriptionPlanFeatures {
  scheduling: boolean;
  support_chat: boolean;
  multi_platform: boolean;
  carousel_editor: boolean;
  ai_captions: boolean;
  basic_reports: boolean;
  publish_priority: boolean;
  facebook_business_portfolio: boolean;
}

export function getPlanFeatureKeys(
  features: ISubscriptionPlanFeatures,
): string[] {
  return Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

export function hasPlanFeature(
  features: ISubscriptionPlanFeatures,
  feature: keyof ISubscriptionPlanFeatures,
): boolean {
  return Boolean(features[feature]);
}

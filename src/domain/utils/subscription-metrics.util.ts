import type { IPlanDistributionItem } from "@/domain/repositories/admin-analytics.repository";

interface IPlanPrice {
  id: string;
  priceMonthlyBrl: number | { toString(): string };
}

interface IPlanGroupCount {
  planId: string;
  count: number;
}

export function calculateMrrFromPlanGroups(
  planGroups: IPlanGroupCount[],
  plans: IPlanPrice[],
): number {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  return planGroups.reduce((total, group) => {
    const plan = planById.get(group.planId);

    if (!plan) {
      return total;
    }

    return total + Number(plan.priceMonthlyBrl) * group.count;
  }, 0);
}

export function buildPlanDistribution(
  planGroups: IPlanGroupCount[],
  plans: Array<{ id: string; name: string }>,
): IPlanDistributionItem[] {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  return planGroups
    .map((group) => {
      const plan = planById.get(group.planId);

      return {
        planId: group.planId,
        planName: plan?.name ?? group.planId,
        count: group.count,
      };
    })
    .sort((left, right) => right.count - left.count);
}

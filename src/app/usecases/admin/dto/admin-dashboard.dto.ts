export interface IAdminPlanDistributionItemDto {
  planId: string;
  planName: string;
  count: number;
}

export interface IAdminMostPopularPlanDto {
  planId: string;
  planName: string;
  count: number;
}

export interface IAdminZernioCostEstimateDto {
  connectedAccounts: number;
  accountDaysThisMonth: number;
  projectedAccountDaysThisMonth: number;
  billableUnitsToDate: number;
  projectedBillableUnits: number;
  estimatedCostToDateUsd: number;
  projectedMonthlyCostUsd: number;
  effectiveCostPerAccountUsd: number;
  marginalRatePerAccountUsd: number;
  freeCreditUsd: number;
}

export interface IAdminDashboardMetricsDto {
  mrr: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  mostPopularPlan: IAdminMostPopularPlanDto | null;
  planDistribution: IAdminPlanDistributionItemDto[];
  zernio: IAdminZernioCostEstimateDto;
  totalUsers: number;
  connectedAccounts: number;
  totalPosts: number;
  totalStories: number;
}

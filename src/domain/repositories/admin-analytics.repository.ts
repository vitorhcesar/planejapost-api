import type { IZernioCostEstimate } from "@/domain/utils/zernio-pricing.util";

export interface IPlanDistributionItem {
  planId: string;
  planName: string;
  count: number;
}

export interface IMostPopularPlan {
  planId: string;
  planName: string;
  count: number;
}

export interface IAdminOverviewMetrics {
  mrr: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  mostPopularPlan: IMostPopularPlan | null;
  planDistribution: IPlanDistributionItem[];
  zernio: IZernioCostEstimate;
  totalUsers: number;
  connectedAccounts: number;
  totalPosts: number;
  totalStories: number;
}

export interface IAdminPeriodDailyGrowth {
  date: string;
  newUsers: number;
  newSubscriptions: number;
  newConnections: number;
}

export interface IAdminPeriodMetrics {
  newUsers: number;
  newSubscriptions: number;
  newConnections: number;
  canceledSubscriptions: number;
  dailyGrowth: IAdminPeriodDailyGrowth[];
}

export interface IAdminAnalyticsRepository {
  getOverviewMetrics(): Promise<IAdminOverviewMetrics>;
  getPeriodMetrics(from: Date, to: Date): Promise<IAdminPeriodMetrics>;
}

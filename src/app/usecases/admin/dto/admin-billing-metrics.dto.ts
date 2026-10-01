export interface IAdminBillingDailyMetricDto {
  date: string;
  pixRevenue: number;
  cardRevenue: number;
  totalRevenue: number;
  invoicesCreated: number;
  invoicesPaid: number;
}

export interface IAdminPeriodDailyGrowthDto {
  date: string;
  newUsers: number;
  newSubscriptions: number;
  newConnections: number;
}

export interface IAdminBillingMetricsDto {
  from: string;
  to: string;
  totalPixRevenue: number;
  totalCardRevenue: number;
  totalRevenue: number;
  invoicesCreated: number;
  invoicesPaid: number;
  pendingInvoices: number;
  newUsers: number;
  newSubscriptions: number;
  newConnections: number;
  canceledSubscriptions: number;
  dailyBreakdown: IAdminBillingDailyMetricDto[];
  dailyGrowth: IAdminPeriodDailyGrowthDto[];
}

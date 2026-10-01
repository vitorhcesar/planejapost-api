export interface ISubscriptionBillingDailyMetric {
  date: string;
  pixRevenue: number;
  cardRevenue: number;
  totalRevenue: number;
  invoicesCreated: number;
  invoicesPaid: number;
}

export interface ISubscriptionBillingMetrics {
  from: string;
  to: string;
  totalPixRevenue: number;
  totalCardRevenue: number;
  totalRevenue: number;
  invoicesCreated: number;
  invoicesPaid: number;
  pendingInvoices: number;
  dailyBreakdown: ISubscriptionBillingDailyMetric[];
}

export interface ISubscriptionBillingRepository {
  getMetrics(from: Date, to: Date): Promise<ISubscriptionBillingMetrics>;
}

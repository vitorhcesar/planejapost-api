import type { IAdminBillingMetricsDto } from "@/app/usecases/admin/dto/admin-billing-metrics.dto";
import type { IAdminAnalyticsRepository } from "@/domain/repositories/admin-analytics.repository";
import type { ISubscriptionBillingRepository } from "@/domain/repositories/subscription-billing.repository";

export interface IGetAdminBillingMetricsInput {
  from: Date;
  to: Date;
}

export class GetAdminBillingMetricsUseCase {
  constructor(
    private readonly subscriptionBillingRepository: ISubscriptionBillingRepository,
    private readonly adminAnalyticsRepository: IAdminAnalyticsRepository,
  ) {}

  async execute(
    input: IGetAdminBillingMetricsInput,
  ): Promise<IAdminBillingMetricsDto> {
    const [billingMetrics, periodMetrics] = await Promise.all([
      this.subscriptionBillingRepository.getMetrics(input.from, input.to),
      this.adminAnalyticsRepository.getPeriodMetrics(input.from, input.to),
    ]);

    return {
      ...billingMetrics,
      newUsers: periodMetrics.newUsers,
      newSubscriptions: periodMetrics.newSubscriptions,
      newConnections: periodMetrics.newConnections,
      canceledSubscriptions: periodMetrics.canceledSubscriptions,
      dailyGrowth: periodMetrics.dailyGrowth,
    };
  }
}

import type { IAdminDashboardMetricsDto } from "@/app/usecases/admin/dto/admin-dashboard.dto";
import type { IAdminAnalyticsRepository } from "@/domain/repositories/admin-analytics.repository";

export class GetAdminDashboardMetricsUseCase {
  constructor(
    private readonly adminAnalyticsRepository: IAdminAnalyticsRepository,
  ) {}

  async execute(): Promise<IAdminDashboardMetricsDto> {
    const metrics = await this.adminAnalyticsRepository.getOverviewMetrics();

    return metrics;
  }
}

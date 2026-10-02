import type {
  IPublicationAnalyticsDto,
  IPublicationAnalyticsMetricsDto,
  IPublicationPlatformAnalyticsDto,
} from "@/app/usecases/publication/dto/publication-analytics.dto";
import type {
  IZernioPostAnalytics,
  IZernioPostAnalyticsMetrics,
} from "@/domain/zernio/zernio.types";

function mapMetrics(
  metrics: IZernioPostAnalyticsMetrics | null,
): IPublicationAnalyticsMetricsDto | null {
  if (!metrics) {
    return null;
  }

  return {
    impressions: metrics.impressions,
    reach: metrics.reach,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    saves: metrics.saves,
    clicks: metrics.clicks,
    views: metrics.views,
    engagementRate: metrics.engagementRate,
    lastUpdated: metrics.lastUpdated,
  };
}

export function mapZernioAnalyticsToDto(
  analytics: IZernioPostAnalytics,
): IPublicationAnalyticsDto {
  return {
    available: true,
    syncStatus: analytics.syncStatus,
    message: analytics.message,
    publishedAt: analytics.publishedAt,
    aggregate: mapMetrics(analytics.aggregate),
    platforms: analytics.platforms.map(
      (platform): IPublicationPlatformAnalyticsDto => ({
        platform: platform.platform,
        accountUsername: platform.accountUsername,
        syncStatus: platform.syncStatus,
        errorMessage: platform.errorMessage,
        platformPostUrl: platform.platformPostUrl,
        analytics: mapMetrics(platform.analytics),
      }),
    ),
  };
}

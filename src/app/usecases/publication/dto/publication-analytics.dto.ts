export interface IPublicationAnalyticsMetricsDto {
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  views: number | null;
  engagementRate: number | null;
  lastUpdated: string | null;
}

export interface IPublicationPlatformAnalyticsDto {
  platform: string;
  accountUsername: string | null;
  syncStatus: "synced" | "pending" | "unavailable";
  errorMessage: string | null;
  platformPostUrl: string | null;
  analytics: IPublicationAnalyticsMetricsDto | null;
}

export interface IPublicationAnalyticsDto {
  available: boolean;
  syncStatus: "synced" | "pending" | "partial" | "unavailable" | "not_applicable";
  message: string | null;
  publishedAt: string | null;
  aggregate: IPublicationAnalyticsMetricsDto | null;
  platforms: IPublicationPlatformAnalyticsDto[];
}

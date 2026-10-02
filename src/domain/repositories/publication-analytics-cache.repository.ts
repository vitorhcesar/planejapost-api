import type { IPublicationAnalyticsDto } from "@/app/usecases/publication/dto/publication-analytics.dto";

export interface IPublicationAnalyticsCacheRecord {
  publicationId: string;
  zernioPostId: string;
  analytics: IPublicationAnalyticsDto;
  syncedAt: Date | null;
  updatedAt: Date;
}

export interface IPublicationAnalyticsCacheRepository {
  findByPublicationId(
    publicationId: string,
  ): Promise<IPublicationAnalyticsCacheRecord | null>;
  upsert(input: {
    publicationId: string;
    zernioPostId: string;
    analytics: IPublicationAnalyticsDto;
    syncedAt?: Date | null;
  }): Promise<IPublicationAnalyticsCacheRecord>;
}

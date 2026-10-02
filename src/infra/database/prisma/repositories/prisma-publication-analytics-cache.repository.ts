import type { IPublicationAnalyticsDto } from "@/app/usecases/publication/dto/publication-analytics.dto";
import type {
  IPublicationAnalyticsCacheRecord,
  IPublicationAnalyticsCacheRepository,
} from "@/domain/repositories/publication-analytics-cache.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import type { Prisma } from "../../../../../generated/prisma";

export class PrismaPublicationAnalyticsCacheRepository
  extends BasePrismaRepository
  implements IPublicationAnalyticsCacheRepository
{
  async findByPublicationId(
    publicationId: string,
  ): Promise<IPublicationAnalyticsCacheRecord | null> {
    const row = await this.getPrismaClient().publicationAnalyticsCache.findUnique({
      where: { publicationId },
    });

    return row ? this.mapRow(row) : null;
  }

  async upsert(input: {
    publicationId: string;
    zernioPostId: string;
    analytics: IPublicationAnalyticsDto;
    syncedAt?: Date | null;
  }): Promise<IPublicationAnalyticsCacheRecord> {
    const row = await this.getPrismaClient().publicationAnalyticsCache.upsert({
      where: { publicationId: input.publicationId },
      create: {
        publicationId: input.publicationId,
        zernioPostId: input.zernioPostId,
        syncStatus: input.analytics.syncStatus,
        message: input.analytics.message,
        publishedAt: input.analytics.publishedAt
          ? new Date(input.analytics.publishedAt)
          : null,
        aggregate: input.analytics.aggregate as unknown as Prisma.InputJsonValue,
        platforms: input.analytics.platforms as unknown as Prisma.InputJsonValue,
        syncedAt: input.syncedAt ?? new Date(),
      },
      update: {
        zernioPostId: input.zernioPostId,
        syncStatus: input.analytics.syncStatus,
        message: input.analytics.message,
        publishedAt: input.analytics.publishedAt
          ? new Date(input.analytics.publishedAt)
          : null,
        aggregate: input.analytics.aggregate as unknown as Prisma.InputJsonValue,
        platforms: input.analytics.platforms as unknown as Prisma.InputJsonValue,
        syncedAt: input.syncedAt ?? new Date(),
      },
    });

    return this.mapRow(row);
  }

  private mapRow(row: {
    publicationId: string;
    zernioPostId: string;
    syncStatus: string;
    message: string | null;
    publishedAt: Date | null;
    aggregate: unknown;
    platforms: unknown;
    syncedAt: Date | null;
    updatedAt: Date;
  }): IPublicationAnalyticsCacheRecord {
    const analytics: IPublicationAnalyticsDto = {
      available: true,
      syncStatus: row.syncStatus as IPublicationAnalyticsDto["syncStatus"],
      message: row.message,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      aggregate:
        row.aggregate && typeof row.aggregate === "object"
          ? (row.aggregate as IPublicationAnalyticsDto["aggregate"])
          : null,
      platforms: Array.isArray(row.platforms)
        ? (row.platforms as IPublicationAnalyticsDto["platforms"])
        : [],
    };

    return {
      publicationId: row.publicationId,
      zernioPostId: row.zernioPostId,
      analytics,
      syncedAt: row.syncedAt,
      updatedAt: row.updatedAt,
    };
  }
}

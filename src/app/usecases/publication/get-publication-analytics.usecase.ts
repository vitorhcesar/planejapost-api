import { AppError } from "@/domain/errors/app.error";
import { PublicationStatusEnum } from "@/domain/enums/publication.enum";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IZernioAnalyticsService } from "@/domain/zernio/zernio-analytics.service";
import type { IPublicationAnalyticsCacheRepository } from "@/domain/repositories/publication-analytics-cache.repository";
import type { IPublicationAnalyticsDto } from "@/app/usecases/publication/dto/publication-analytics.dto";
import { mapZernioAnalyticsToDto } from "@/app/usecases/publication/map-zernio-analytics-to-dto.util";

const ANALYTICS_ELIGIBLE_STATUSES = new Set<PublicationStatusEnum>([
  PublicationStatusEnum.COMPLETED,
  PublicationStatusEnum.PARTIAL_FAILURE,
  PublicationStatusEnum.UNVERIFIED,
]);

function buildUnavailableResponse(
  syncStatus: IPublicationAnalyticsDto["syncStatus"],
  message: string,
): IPublicationAnalyticsDto {
  return {
    available: false,
    syncStatus,
    message,
    publishedAt: null,
    aggregate: null,
    platforms: [],
  };
}

export class GetPublicationAnalyticsUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly publicationAnalyticsCacheRepository: IPublicationAnalyticsCacheRepository,
    private readonly zernioAnalyticsService: IZernioAnalyticsService,
  ) {}

  async execute(
    authUserId: string,
    publicationId: string,
  ): Promise<IPublicationAnalyticsDto> {
    const publication = await this.publicationRepository.findByIdAndUserId(
      publicationId,
      authUserId,
    );

    if (!publication) {
      throw new AppError("Publicação não encontrada", 404, "publication_not_found");
    }

    if (!ANALYTICS_ELIGIBLE_STATUSES.has(publication.status)) {
      return buildUnavailableResponse(
        "not_applicable",
        "Analytics ficam disponíveis após a publicação ser concluída.",
      );
    }

    if (!publication.zernioPostId) {
      return buildUnavailableResponse(
        "unavailable",
        "Esta publicação não possui referência na Zernio para buscar analytics.",
      );
    }

    const cachedAnalytics =
      await this.publicationAnalyticsCacheRepository.findByPublicationId(
        publication.id,
      );

    if (cachedAnalytics) {
      return cachedAnalytics.analytics;
    }

    try {
      const analytics = await this.zernioAnalyticsService.getPostAnalytics(
        publication.zernioPostId,
      );

      if (!analytics) {
        return buildUnavailableResponse(
          "pending",
          "Ainda não há analytics — snapshots diários serão preenchidos após o próximo sync.",
        );
      }

      const dto = mapZernioAnalyticsToDto(analytics);

      await this.publicationAnalyticsCacheRepository.upsert({
        publicationId: publication.id,
        zernioPostId: publication.zernioPostId,
        analytics: dto,
        syncedAt: new Date(),
      });

      return dto;
    } catch (error) {
      if (error instanceof AppError) {
        if (error.statusCode === 402 || error.code === "analytics_addon_required") {
          return buildUnavailableResponse(
            "unavailable",
            "Analytics não estão habilitados na conta Zernio deste workspace.",
          );
        }

        if (error.statusCode === 403) {
          return buildUnavailableResponse(
            "unavailable",
            "A conta conectada não possui permissão de analytics. Reconecte com o escopo analytics.",
          );
        }
      }

      return buildUnavailableResponse(
        "pending",
        "Ainda não há analytics — snapshots diários serão preenchidos após o próximo sync.",
      );
    }
  }
}

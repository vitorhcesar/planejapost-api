import { AppError } from "@/domain/errors/app.error";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IPublicationDto } from "@/app/usecases/publication/dto/publication.dto";
import { mapPublicationToDto } from "@/app/usecases/publication/map-publication-to-dto.util";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import {
  isValidIanaTimezone,
  parseScheduledForToUtcDate,
  scheduledForHasExplicitOffset,
} from "@/domain/utils/parse-scheduled-for.util";
import { mapZernioErrorToAppError } from "@/domain/zernio/map-zernio-error.util";

export interface IReschedulePublicationInput {
  scheduledFor: string;
  timezone?: string;
}

export class ReschedulePublicationUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly zernioPostService: IZernioPostService,
  ) {}

  async execute(
    authUserId: string,
    publicationId: string,
    input: IReschedulePublicationInput,
  ): Promise<IPublicationDto> {
    const publication = await this.publicationRepository.findByIdAndUserId(
      publicationId,
      authUserId,
    );

    if (!publication) {
      throw new AppError("Publicação não encontrada", 404, "publication_not_found");
    }

    if (!publication.canBeCancelledOrRescheduled()) {
      throw new AppError(
        "Somente publicações agendadas ou rascunhos podem ser reagendadas",
        400,
        "publication_not_editable",
      );
    }

    if (!publication.zernioPostId) {
      throw new AppError(
        "Publicação ainda não vinculada à Zernio",
        400,
        "zernio_post_missing",
      );
    }

    const scheduleInput = this.resolveScheduleInput(input);

    try {
      await this.zernioPostService.updatePost({
        postId: publication.zernioPostId,
        scheduledFor: scheduleInput.scheduledForRaw,
        timezone: scheduleInput.timezone,
      });
    } catch (error) {
      throw mapZernioErrorToAppError(error);
    }

    publication.reschedule(scheduleInput.scheduledForUtc, scheduleInput.timezone);
    const saved = await this.publicationRepository.save(publication);

    return mapPublicationToDto(saved);
  }

  private resolveScheduleInput(input: IReschedulePublicationInput): {
    scheduledForRaw: string;
    scheduledForUtc: Date;
    timezone: string;
  } {
    const scheduledForRaw = input.scheduledFor.trim();

    if (!scheduledForRaw) {
      throw new AppError(
        "scheduledFor é obrigatório",
        400,
        "scheduled_for_required",
      );
    }

    const timezone = input.timezone?.trim();

    if (!scheduledForHasExplicitOffset(scheduledForRaw)) {
      if (!timezone) {
        throw new AppError(
          "timezone é obrigatório quando scheduledFor não possui offset",
          400,
          "timezone_required",
        );
      }

      if (!isValidIanaTimezone(timezone)) {
        throw new AppError("timezone inválido", 400, "invalid_timezone");
      }
    } else if (timezone && !isValidIanaTimezone(timezone)) {
      throw new AppError("timezone inválido", 400, "invalid_timezone");
    }

    const resolvedTimezone = timezone ?? "UTC";

    return {
      scheduledForRaw,
      scheduledForUtc: parseScheduledForToUtcDate(
        scheduledForRaw,
        resolvedTimezone,
      ),
      timezone: resolvedTimezone,
    };
  }
}

export class CancelPublicationUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly zernioPostService: IZernioPostService,
  ) {}

  async execute(authUserId: string, publicationId: string): Promise<IPublicationDto> {
    const publication = await this.publicationRepository.findByIdAndUserId(
      publicationId,
      authUserId,
    );

    if (!publication) {
      throw new AppError("Publicação não encontrada", 404, "publication_not_found");
    }

    if (!publication.canBeCancelledOrRescheduled()) {
      throw new AppError(
        "Somente publicações agendadas ou rascunhos podem ser canceladas",
        400,
        "publication_not_cancellable",
      );
    }

    if (publication.zernioPostId) {
      try {
        await this.zernioPostService.cancelPost(publication.zernioPostId);
      } catch (error) {
        throw mapZernioErrorToAppError(error);
      }
    }

    publication.markAsCancelled();
    const saved = await this.publicationRepository.save(publication);

    return mapPublicationToDto(saved);
  }
}

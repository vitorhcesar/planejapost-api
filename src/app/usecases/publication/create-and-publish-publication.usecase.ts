import { AppError } from "@/domain/errors/app.error";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTypeEnum,
  PublishModeEnum,
} from "@/domain/enums/publication.enum";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IPublicationDto } from "@/app/usecases/publication/dto/publication.dto";
import { mapPublicationToDto } from "@/app/usecases/publication/map-publication-to-dto.util";
import type { IZernioMediaService } from "@/domain/zernio/zernio-media.service";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import type { ITemporaryPublicationMediaStorage } from "@/domain/storages/temporary-publication-media.storage";
import { buildZernioPostPayload } from "@/infra/zernio/zernio-post-payload.builder";
import {
  getExistingPostIdFromError,
  mapZernioErrorToAppError,
} from "@/domain/zernio/map-zernio-error.util";
import { resolvePublicationVerificationTimeout } from "@/app/usecases/publication/resolve-publication-verification-timeout.util";
import {
  isValidIanaTimezone,
  parseScheduledForToUtcDate,
  scheduledForHasExplicitOffset,
} from "@/domain/utils/parse-scheduled-for.util";

export interface ICreatePublicationInput {
  type: PublicationTypeEnum;
  destinationScope: PublicationDestinationScopeEnum;
  caption?: string | null;
  objectKey?: string;
  objectKeys?: string[];
  socialConnectedAccountIds?: string[];
  scheduledFor?: string;
  timezone?: string;
  publishMode?: PublishModeEnum;
}

export class CreateAndPublishPublicationUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly zernioPostService: IZernioPostService,
    private readonly zernioMediaService: IZernioMediaService,
    private readonly temporaryMediaStorage: ITemporaryPublicationMediaStorage,
  ) {}

  async execute(
    authUserId: string,
    input: ICreatePublicationInput,
  ): Promise<IPublicationDto> {
    const isScheduled = this.isScheduledInput(input);
    const scheduleInput = isScheduled ? this.resolveScheduleInput(input) : null;

    const destinationAccounts = await this.resolveDestinationAccounts(
      authUserId,
      input,
    );

    if (destinationAccounts.length === 0) {
      throw new AppError(
        "Nenhuma conta social conectada disponível para publicação",
        400,
        "no_social_accounts_available",
      );
    }

    const blockedAccount = destinationAccounts.find((account) => !account.canPost);

    if (blockedAccount) {
      throw new AppError(
        "Uma ou mais contas selecionadas não podem publicar no momento",
        400,
        "platform_post_not_allowed",
        { accountId: blockedAccount.id },
      );
    }

    const objectKeys = this.resolveObjectKeys(input);

    if (objectKeys.length === 0) {
      throw new AppError(
        "Arquivo de mídia é obrigatório",
        400,
        "media_required",
      );
    }

    const mediaUrls = await this.resolveMediaUrls(authUserId, objectKeys);

    const publication = Publication.create({
      userId: authUserId,
      type: input.type,
      destinationScope: input.destinationScope,
      caption: input.caption,
      mediaUrl: mediaUrls[0]!,
      objectKey: objectKeys[0]!,
      objectKeys,
      publishMode: isScheduled ? PublishModeEnum.SCHEDULED : PublishModeEnum.NOW,
      scheduledFor: scheduleInput?.scheduledForUtc ?? null,
      timezone: scheduleInput?.timezone ?? null,
      targets: destinationAccounts.map((account) => ({
        socialConnectedAccountId: account.id,
        platform: account.platform,
        zernioAccountId: account.zernioAccountId,
      })),
    });

    const savedPublication = await this.publicationRepository.save(publication);

    try {
      const payload = buildZernioPostPayload(savedPublication, mediaUrls, {
        publishNow: !isScheduled,
        scheduledFor: scheduleInput?.scheduledForRaw,
        timezone: scheduleInput?.timezone,
      });
      const zernioPost = await this.zernioPostService.createPost(payload);

      savedPublication.setZernioPostId(zernioPost.postId);

      if (isScheduled && zernioPost.status.toLowerCase() === "scheduled") {
        savedPublication.markAsScheduled(
          scheduleInput!.scheduledForUtc,
          scheduleInput!.timezone,
        );
      } else {
        savedPublication.markAsProcessing();
      }

      await this.publicationRepository.save(savedPublication);
    } catch (error) {
      const existingPostId = getExistingPostIdFromError(error);

      if (existingPostId) {
        savedPublication.setZernioPostId(existingPostId);

        if (isScheduled) {
          savedPublication.markAsScheduled(
            scheduleInput!.scheduledForUtc,
            scheduleInput!.timezone,
          );
        } else {
          savedPublication.markAsProcessing();
        }

        await this.publicationRepository.save(savedPublication);
      } else {
        throw mapZernioErrorToAppError(error);
      }
    }

    const refreshed = await this.publicationRepository.findById(savedPublication.id);
    return mapPublicationToDto(refreshed ?? savedPublication);
  }

  private isScheduledInput(input: ICreatePublicationInput): boolean {
    if (input.publishMode === PublishModeEnum.SCHEDULED) {
      return true;
    }

    return Boolean(input.scheduledFor);
  }

  private resolveScheduleInput(input: ICreatePublicationInput): {
    scheduledForRaw: string;
    scheduledForUtc: Date;
    timezone: string;
  } {
    const scheduledForRaw = input.scheduledFor?.trim();

    if (!scheduledForRaw) {
      throw new AppError(
        "scheduledFor é obrigatório para agendamento",
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

  private async resolveDestinationAccounts(
    authUserId: string,
    input: ICreatePublicationInput,
  ) {
    const connectedAccounts =
      await this.socialConnectedAccountRepository.findConnectedByUserId(authUserId);

    if (input.destinationScope === PublicationDestinationScopeEnum.ALL) {
      return connectedAccounts;
    }

    const selectedIds = input.socialConnectedAccountIds ?? [];

    if (selectedIds.length === 0) {
      throw new AppError(
        "Selecione ao menos uma conta social",
        400,
        "social_accounts_required",
      );
    }

    const activeAccountIds = new Set(connectedAccounts.map((account) => account.id));
    const invalidIds = selectedIds.filter((id) => !activeAccountIds.has(id));

    if (invalidIds.length > 0) {
      throw new AppError(
        "Uma ou mais contas selecionadas são inválidas",
        400,
        "invalid_social_accounts",
        { invalidIds },
      );
    }

    return connectedAccounts.filter((account) => selectedIds.includes(account.id));
  }

  private resolveObjectKeys(input: ICreatePublicationInput): string[] {
    if (input.objectKeys && input.objectKeys.length > 0) {
      return input.objectKeys;
    }

    if (input.objectKey) {
      return [input.objectKey];
    }

    return [];
  }

  private async resolveMediaUrls(
    authUserId: string,
    objectKeys: string[],
  ): Promise<string[]> {
    const urls: string[] = [];

    for (const objectKey of objectKeys) {
      if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
        urls.push(objectKey);
        continue;
      }

      const streamResult = await this.temporaryMediaStorage.getStream(objectKey);
      const chunks: Buffer[] = [];

      for await (const chunk of streamResult.stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      const filename = objectKey.split("/").pop() ?? "media.bin";
      const presigned = await this.zernioMediaService.presignUpload({
        filename,
        contentType: streamResult.contentType,
        size: buffer.length,
      });

      await this.zernioMediaService.uploadToPresignedUrl({
        uploadUrl: presigned.uploadUrl,
        buffer,
        contentType: streamResult.contentType,
      });

      urls.push(presigned.publicUrl);
    }

    return urls;
  }
}

export interface IListPublicationsInput {
  status?: string;
  from?: string;
  to?: string;
}

export class ListPublicationsUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly logger: ILogger,
    private readonly zernioPostService: IZernioPostService,
  ) {}

  async execute(
    authUserId: string,
    filters: IListPublicationsInput = {},
  ): Promise<IPublicationDto[]> {
    const publications = await this.publicationRepository.findAllByUserIdWithFilters(
      authUserId,
      {
        status: filters.status as PublicationStatusEnum | undefined,
        from: filters.from ? new Date(filters.from) : undefined,
        to: filters.to ? new Date(filters.to) : undefined,
      },
    );

    const resolvedPublications = await Promise.all(
      publications.map((publication) =>
        resolvePublicationVerificationTimeout(
          publication,
          this.publicationRepository,
          this.logger,
          this.zernioPostService,
        ),
      ),
    );

    return resolvedPublications.map(mapPublicationToDto);
  }
}

export class GetPublicationUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly logger: ILogger,
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

    const resolvedPublication = await resolvePublicationVerificationTimeout(
      publication,
      this.publicationRepository,
      this.logger,
      this.zernioPostService,
    );

    return mapPublicationToDto(resolvedPublication);
  }
}

export class GetPublicationThumbnailUseCase {
  constructor(private readonly publicationRepository: IPublicationRepository) {}

  async execute(authUserId: string, publicationId: string): Promise<string | null> {
    const publication = await this.publicationRepository.findByIdAndUserId(
      publicationId,
      authUserId,
    );

    if (!publication) {
      throw new AppError("Publicação não encontrada", 404, "publication_not_found");
    }

    const successTarget = publication.targets.find(
      (target) => target.platformPostUrl !== null,
    );

    return successTarget?.platformPostUrl ?? publication.mediaUrl ?? null;
  }
}

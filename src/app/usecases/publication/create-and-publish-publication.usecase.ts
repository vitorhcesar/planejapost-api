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
import type { IUserZernioQueueRepository } from "@/domain/repositories/user-zernio-queue.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";
import { EnsureDefaultWorkspaceUseCase } from "@/app/usecases/workspace/workspace.usecases";
import type { ILogger } from "@/domain/services/logger.service";
import type { IPublicationDto } from "@/app/usecases/publication/dto/publication.dto";
import { parseZernioScheduledFor } from "@/app/usecases/publication/publication-queue.usecase";
import { mapPublicationToDto } from "@/app/usecases/publication/map-publication-to-dto.util";
import type { AssertSubscriptionForPublishUseCase } from "@/app/usecases/subscription/subscription.usecases";
import { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import { assertCaptionWithinPlatformLimits } from "@/domain/utils/validate-publication-caption.util";
import { assertValidMediaUrls } from "@/domain/utils/validate-media-url.util";
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
  workspaceId?: string;
  caption?: string | null;
  mediaUrl?: string;
  mediaUrls?: string[];
  socialConnectedAccountIds?: string[];
  scheduledFor?: string;
  timezone?: string;
  publishMode?: PublishModeEnum;
}

export class CreateAndPublishPublicationUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly ensureDefaultWorkspaceUseCase: EnsureDefaultWorkspaceUseCase,
    private readonly userRepository: IUserRepository,
    private readonly userZernioQueueRepository: IUserZernioQueueRepository,
    private readonly ensureZernioProfileUseCase: EnsureZernioProfileUseCase,
    private readonly zernioPostService: IZernioPostService,
    private readonly assertSubscriptionForPublishUseCase: AssertSubscriptionForPublishUseCase,
  ) {}

  async execute(
    authUserId: string,
    input: ICreatePublicationInput,
  ): Promise<IPublicationDto> {
    await this.assertSubscriptionForPublishUseCase.execute(authUserId);

    const publishMode = this.resolvePublishMode(input);
    const isQueued = publishMode === PublishModeEnum.QUEUED;
    const isScheduled = publishMode === PublishModeEnum.SCHEDULED;
    const scheduleInput = isScheduled ? this.resolveScheduleInput(input) : null;
    const queueInput = isQueued ? await this.resolveQueueInput(authUserId) : null;

    const publicationWorkspaceId = await this.resolvePublicationWorkspaceId(
      authUserId,
      input,
    );

    const destinationAccounts = await this.resolveDestinationAccounts(
      authUserId,
      input,
      publicationWorkspaceId,
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

    const mediaUrls = this.resolveMediaUrls(input);

    assertCaptionWithinPlatformLimits({
      caption: input.caption,
      platforms: destinationAccounts.map((account) => account.platform),
    });

    if (mediaUrls.length === 0) {
      throw new AppError(
        "Arquivo de mídia é obrigatório",
        400,
        "media_required",
      );
    }

    const publication = Publication.create({
      userId: authUserId,
      workspaceId: publicationWorkspaceId,
      type: input.type,
      destinationScope: input.destinationScope,
      caption: input.caption,
      mediaUrl: mediaUrls[0]!,
      objectKey: mediaUrls[0]!,
      objectKeys: mediaUrls,
      publishMode,
      scheduledFor: scheduleInput?.scheduledForUtc ?? null,
      timezone: scheduleInput?.timezone ?? queueInput?.timezone ?? null,
      targets: destinationAccounts.map((account) => ({
        socialConnectedAccountId: account.id,
        platform: account.platform,
        zernioAccountId: account.zernioAccountId,
      })),
    });

    const savedPublication = await this.publicationRepository.save(publication);

    try {
      const payload = buildZernioPostPayload(savedPublication, mediaUrls, {
        publishNow: !isScheduled && !isQueued,
        scheduledFor: scheduleInput?.scheduledForRaw,
        timezone: scheduleInput?.timezone,
        queuedFromProfile: queueInput?.profileId,
        queueId: queueInput?.queueId,
      });
      const zernioPost = await this.zernioPostService.createPost(payload);

      savedPublication.setZernioPostId(zernioPost.postId);
      this.applyZernioPostState(savedPublication, {
        isScheduled,
        isQueued,
        scheduleInput,
        queueInput,
        zernioPost,
      });

      await this.publicationRepository.save(savedPublication);
    } catch (error) {
      const existingPostId = getExistingPostIdFromError(error);

      if (existingPostId) {
        savedPublication.setZernioPostId(existingPostId);
        this.applyZernioPostState(savedPublication, {
          isScheduled,
          isQueued,
          scheduleInput,
          queueInput,
          zernioPost: {
            postId: existingPostId,
            status: isScheduled || isQueued ? "scheduled" : "publishing",
            scheduledFor: scheduleInput?.scheduledForRaw ?? null,
            timezone:
              scheduleInput?.timezone ?? queueInput?.timezone ?? null,
            platforms: [],
          },
        });

        await this.publicationRepository.save(savedPublication);
      } else {
        throw mapZernioErrorToAppError(error);
      }
    }

    const refreshed = await this.publicationRepository.findById(savedPublication.id);
    return mapPublicationToDto(refreshed ?? savedPublication);
  }

  private resolvePublishMode(input: ICreatePublicationInput): PublishModeEnum {
    if (input.publishMode === PublishModeEnum.QUEUED) {
      return PublishModeEnum.QUEUED;
    }

    if (input.publishMode === PublishModeEnum.SCHEDULED || input.scheduledFor) {
      return PublishModeEnum.SCHEDULED;
    }

    return PublishModeEnum.NOW;
  }

  private async resolveQueueInput(authUserId: string): Promise<{
    profileId: string;
    queueId: string;
    timezone: string;
  }> {
    const user = await this.userRepository.findById(authUserId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const queue = await this.userZernioQueueRepository.findByUserId(authUserId);

    if (!queue || !queue.active || queue.slots.length === 0) {
      throw new AppError(
        "Configure os horários de publicação antes de usar a fila",
        400,
        "publication_queue_not_configured",
      );
    }

    const profileId = await this.ensureZernioProfileUseCase.execute(authUserId);

    return {
      profileId,
      queueId: queue.zernioQueueId,
      timezone: queue.timezone,
    };
  }

  private applyZernioPostState(
    publication: Publication,
    input: {
      isScheduled: boolean;
      isQueued: boolean;
      scheduleInput: {
        scheduledForRaw: string;
        scheduledForUtc: Date;
        timezone: string;
      } | null;
      queueInput: {
        profileId: string;
        queueId: string;
        timezone: string;
      } | null;
      zernioPost: {
        postId: string;
        status: string;
        scheduledFor: string | null;
        timezone: string | null;
        platforms: unknown[];
      };
    },
  ): void {
    const normalizedStatus = input.zernioPost.status.toLowerCase();

    if (input.isQueued && input.queueInput) {
      publication.markAsQueued({
        zernioQueueId: input.queueInput.queueId,
        scheduledFor: parseZernioScheduledFor(
          input.zernioPost.scheduledFor,
          input.queueInput.timezone,
        ),
        timezone: input.queueInput.timezone,
      });
      return;
    }

    if (input.isScheduled && normalizedStatus === "scheduled" && input.scheduleInput) {
      publication.markAsScheduled(
        input.scheduleInput.scheduledForUtc,
        input.scheduleInput.timezone,
      );
      return;
    }

    publication.markAsProcessing();
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

  private async resolvePublicationWorkspaceId(
    authUserId: string,
    input: ICreatePublicationInput,
  ): Promise<string | null> {
    if (input.destinationScope !== PublicationDestinationScopeEnum.WORKSPACE) {
      return input.workspaceId ?? null;
    }

    if (input.workspaceId) {
      const workspace = await this.workspaceRepository.findActiveByIdAndUserId(
        input.workspaceId,
        authUserId,
      );

      if (!workspace) {
        throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
      }

      return workspace.id;
    }

    const defaultWorkspace =
      await this.ensureDefaultWorkspaceUseCase.execute(authUserId);

    return defaultWorkspace.id;
  }

  private async resolveDestinationAccounts(
    authUserId: string,
    input: ICreatePublicationInput,
    publicationWorkspaceId: string | null,
  ) {
    const connectedAccounts =
      input.destinationScope === PublicationDestinationScopeEnum.WORKSPACE &&
      publicationWorkspaceId
        ? await this.socialConnectedAccountRepository.findConnectedByWorkspaceId(
            publicationWorkspaceId,
          )
        : await this.socialConnectedAccountRepository.findConnectedByUserId(
            authUserId,
          );

    if (input.destinationScope === PublicationDestinationScopeEnum.ALL) {
      return connectedAccounts;
    }

    if (input.destinationScope === PublicationDestinationScopeEnum.WORKSPACE) {
      return connectedAccounts.filter((account) => account.canPost);
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

  private resolveMediaUrls(input: ICreatePublicationInput): string[] {
    const urls =
      input.mediaUrls && input.mediaUrls.length > 0
        ? input.mediaUrls
        : input.mediaUrl
          ? [input.mediaUrl]
          : [];

    return assertValidMediaUrls(urls);
  }
}

export interface IListPublicationsInput {
  status?: string;
  workspaceId?: string;
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
        workspaceId: filters.workspaceId,
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

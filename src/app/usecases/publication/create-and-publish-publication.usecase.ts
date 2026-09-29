import { AppError } from "@/domain/errors/app.error";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationTypeEnum,
} from "@/domain/enums/instagram.enum";
import type { IInstagramConnectedAccountRepository } from "@/domain/repositories/instagram-connected-account.repository";
import type { IInstagramGraphService } from "@/domain/instagram/instagram.service";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IPublicationDto } from "@/app/usecases/publication/dto/publication.dto";
import { mapPublicationToDto } from "@/app/usecases/publication/map-publication-to-dto.util";
import type { IPublicationQueue } from "@/domain/queue/publication-queue";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";

export interface ICreatePublicationInput {
  type: PublicationTypeEnum;
  destinationScope: PublicationDestinationScopeEnum;
  caption?: string | null;
  objectKey?: string;
  objectKeys?: string[];
  instagramConnectedAccountIds?: string[];
}

export class CreateAndPublishPublicationUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly instagramConnectedAccountRepository: IInstagramConnectedAccountRepository,
    private readonly publicationQueue: IPublicationQueue,
    private readonly publicApiConfig: IPublicApiConfig,
  ) {}

  async execute(
    authUserId: string,
    input: ICreatePublicationInput,
  ): Promise<IPublicationDto> {
    const destinationAccountIds = await this.resolveDestinationAccountIds(
      authUserId,
      input,
    );

    if (destinationAccountIds.length === 0) {
      throw new AppError(
        "Nenhuma conta Instagram conectada disponível para publicação",
        400,
        "no_instagram_accounts_available",
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

    const mediaUrls = objectKeys.map(
      (objectKey) => `${this.publicApiConfig.publicApiUrl}/public/objects/${objectKey}`,
    );

    const publication = Publication.create({
      userId: authUserId,
      type: input.type,
      destinationScope: input.destinationScope,
      caption: input.caption,
      mediaUrl: mediaUrls[0]!,
      objectKey: objectKeys[0]!,
      objectKeys,
      instagramConnectedAccountIds: destinationAccountIds,
    });

    const savedPublication = await this.publicationRepository.save(publication);

    await this.publicationQueue.enqueue(savedPublication.id);

    return mapPublicationToDto(savedPublication);
  }

  private async resolveDestinationAccountIds(
    authUserId: string,
    input: ICreatePublicationInput,
  ): Promise<string[]> {
    const connectedAccounts =
      await this.instagramConnectedAccountRepository.findByUserId(authUserId);

    const activeAccounts = connectedAccounts.filter((account) =>
      account.isConnected(),
    );

    if (input.destinationScope === PublicationDestinationScopeEnum.ALL) {
      return activeAccounts.map((account) => account.id);
    }

    const selectedIds = input.instagramConnectedAccountIds ?? [];

    if (selectedIds.length === 0) {
      throw new AppError(
        "Selecione ao menos uma conta Instagram",
        400,
        "instagram_accounts_required",
      );
    }

    const activeAccountIds = new Set(activeAccounts.map((account) => account.id));
    const invalidIds = selectedIds.filter((id) => !activeAccountIds.has(id));

    if (invalidIds.length > 0) {
      throw new AppError(
        "Uma ou mais contas selecionadas são inválidas",
        400,
        "invalid_instagram_accounts",
        { invalidIds },
      );
    }

    return selectedIds;
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
}

export class GetPublicationUseCase {
  constructor(private readonly publicationRepository: IPublicationRepository) {}

  async execute(authUserId: string, publicationId: string): Promise<IPublicationDto> {
    const publication = await this.publicationRepository.findByIdAndUserId(
      publicationId,
      authUserId,
    );

    if (!publication) {
      throw new AppError("Publicação não encontrada", 404, "publication_not_found");
    }

    return mapPublicationToDto(publication);
  }
}

export class ListPublicationsUseCase {
  constructor(private readonly publicationRepository: IPublicationRepository) {}

  async execute(authUserId: string): Promise<IPublicationDto[]> {
    const publications = await this.publicationRepository.findAllByUserId(authUserId);
    return publications.map(mapPublicationToDto);
  }
}

export class GetPublicationThumbnailUseCase {
  constructor(
    private readonly publicationRepository: IPublicationRepository,
    private readonly instagramAccountRepository: IInstagramConnectedAccountRepository,
    private readonly instagramGraphClient: IInstagramGraphService,
  ) {}

  async execute(authUserId: string, publicationId: string): Promise<string | null> {
    const publication = await this.publicationRepository.findByIdAndUserId(
      publicationId,
      authUserId,
    );

    if (!publication) {
      throw new AppError("Publicação não encontrada", 404, "publication_not_found");
    }

    const successTarget = publication.targets.find(
      (t) => t.instagramMediaId !== null,
    );

    if (!successTarget?.instagramMediaId) return null;

    const account = await this.instagramAccountRepository.findById(
      successTarget.instagramConnectedAccountId,
    );

    if (!account) return null;

    return this.instagramGraphClient.getMediaThumbnailUrl(
      successTarget.instagramMediaId,
      account.accessToken,
    );
  }
}

import type { IPublicationQueue } from "@/domain/queue/publication-queue";
import { Queue, Worker, type Job } from "bullmq";
import { EnvService } from "@/infra/config/env.service";
import type { IInstagramContentPublishingService } from "@/domain/instagram/instagram-content-publishing.service";
import type { IInstagramOAuthServiceFactory } from "@/domain/instagram/instagram.service";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IInstagramConnectedAccountRepository } from "@/domain/repositories/instagram-connected-account.repository";
import type { IMetaAppConfigRepository } from "@/domain/repositories/meta-app-config.repository";
import type { ITemporaryPublicationMediaStorage } from "@/domain/storages/temporary-publication-media.storage";
import { PublicationTypeEnum } from "@/domain/enums/instagram.enum";
import { isInstagramAccountAuthFailure } from "@/domain/instagram/instagram-account-health.util";
import { AppError } from "@/domain/errors/app.error";

export const PUBLICATION_QUEUE_NAME = "publication";

export interface IPublicationJobData {
  publicationId: string;
}

function buildRedisConnection() {
  const env = EnvService.getInstance();
  return { host: env.redisHost, port: env.redisPort };
}

export class PublicationQueue implements IPublicationQueue {
  private readonly queue: Queue<IPublicationJobData>;

  constructor() {
    this.queue = new Queue<IPublicationJobData>(PUBLICATION_QUEUE_NAME, {
      connection: buildRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  async enqueue(publicationId: string): Promise<void> {
    await this.queue.add(
      "process-publication",
      { publicationId },
      { jobId: `publication_${publicationId}` },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export interface IPublicationWorkerDependencies {
  publicationRepository: IPublicationRepository;
  accountRepository: IInstagramConnectedAccountRepository;
  publishingService: IInstagramContentPublishingService;
  oauthServiceFactory: IInstagramOAuthServiceFactory;
  metaAppConfigRepository: IMetaAppConfigRepository;
  tempStorage: ITemporaryPublicationMediaStorage;
  publicApiUrl: string;
}

export class PublicationWorker {
  private readonly worker: Worker<IPublicationJobData>;

  constructor(private readonly deps: IPublicationWorkerDependencies) {
    this.worker = new Worker<IPublicationJobData>(
      PUBLICATION_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: buildRedisConnection(),
        concurrency: 5,
      },
    );

    this.worker.on("failed", (job, error) => {
      console.error(
        `[PublicationWorker] Job ${job?.id} falhou:`,
        error.message,
      );
    });
  }

  private async process(job: Job<IPublicationJobData>): Promise<void> {
    const { publicationId } = job.data;

    const {
      publicationRepository,
      accountRepository,
      publishingService,
      oauthServiceFactory,
      metaAppConfigRepository,
      tempStorage,
      publicApiUrl,
    } = this.deps;

    const publication = await publicationRepository.findById(publicationId);

    if (!publication) {
      throw new Error(`Publicação ${publicationId} não encontrada`);
    }

    publication.markAsProcessing();
    await publicationRepository.save(publication);

    for (const target of publication.targets) {
      const account = await accountRepository.findById(
        target.instagramConnectedAccountId,
      );

      if (!account || !account.isConnected()) {
        target.markAsFailed("Conta Instagram indisponível");
        continue;
      }

      target.markAsProcessing();

      try {
        let accessToken = account.accessToken;

        if (account.isTokenExpired()) {
          try {
            if (!account.metaAppConfigId) {
              throw new AppError(
                "Conta legada precisa ser reconectada com uma Meta App própria",
                409,
                "legacy_instagram_account_reconnect_required",
              );
            }

            const metaAppConfig = await metaAppConfigRepository.findById(
              account.metaAppConfigId,
            );

            if (!metaAppConfig) {
              throw new AppError(
                "Configuração Meta vinculada à conta não está disponível",
                409,
                "meta_app_config_not_found",
              );
            }

            const oauthService = oauthServiceFactory.create({
              appId: metaAppConfig.appId,
              appSecret: metaAppConfig.appSecret,
              redirectUri: metaAppConfig.redirectUri,
              scopes: metaAppConfig.requestedScopes,
            });
            const refreshed = await oauthService.refreshLongLivedToken(accessToken);
            accessToken = refreshed.accessToken;
            account.updateOAuthData({
              accessToken,
              tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
              scopes: refreshed.scopes.length ? refreshed.scopes : account.scopes,
              username: account.username,
              displayName: account.displayName,
              profilePictureUrl: account.profilePictureUrl,
            });
            await accountRepository.save(account);
          } catch (refreshError) {
            account.markAsExpired();
            await accountRepository.save(account);
            throw refreshError;
          }
        }

        const objectKeys = publication.objectKeys;
        const mediaUrls = objectKeys.map(
          (objectKey) => `${publicApiUrl}/public/objects/${objectKey}`,
        );

        const publishInput = {
          instagramUserId: account.instagramUserId,
          accessToken,
          mediaUrl: mediaUrls[0]!,
          mediaUrls,
          caption: publication.caption,
        };

        const result =
          publication.type === PublicationTypeEnum.STORY
            ? await publishingService.publishStory(publishInput)
            : mediaUrls.length > 1
              ? await publishingService.publishCarouselPost(publishInput)
              : await publishingService.publishPost(publishInput);

        target.markAsSuccess(result.instagramMediaId, result.instagramPermalink);
      } catch (error) {
        const message =
          error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Falha ao publicar no Instagram";

        target.markAsFailed(message);

        if (isInstagramAccountAuthFailure(error)) {
          account.markAsExpired();
          await accountRepository.save(account);
        }
      }
    }

    publication.replaceTargets(publication.targets);
    publication.finalizeStatus();

    const objectKeysToDelete = publication.objectKeys;
    publication.clearObjectKey();

    await publicationRepository.save(publication);

    for (const objectKey of objectKeysToDelete) {
      await tempStorage.delete(objectKey).catch((err: unknown) => {
        console.error(
          `[PublicationWorker] Falha ao deletar mídia temporária ${objectKey}:`,
          err,
        );
      });
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

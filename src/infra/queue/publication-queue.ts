import { Queue, Worker, type Job } from "bullmq";
import { EnvService } from "@/http/services/env/env.service";
import { PrismaPublicationRepository } from "@/infra/database/prisma/repositories/prisma-publication.repository";
import { PrismaInstagramConnectedAccountRepository } from "@/infra/database/prisma/repositories/prisma-instagram-connected-account.repository";
import { InstagramContentPublishingService } from "@/infra/instagram/instagram-content-publishing.service";
import { InstagramOAuthClientFactory } from "@/infra/instagram/instagram-oauth.client";
import { MinioTemporaryPublicationMediaStorage } from "@/infra/object-storage/minio-temporary-publication-media.storage";
import { PublicationTypeEnum } from "@/domain/enums/instagram.enum";
import { isInstagramAccountAuthFailure } from "@/domain/instagram/instagram-account-health.util";
import { AppError } from "@/http/services/app/errors/app.error";
import { PrismaMetaAppConfigRepository } from "@/infra/database/prisma/repositories/prisma-meta-app-config.repository";

export const PUBLICATION_QUEUE_NAME = "publication";

export interface IPublicationJobData {
  publicationId: string;
}

function buildRedisConnection() {
  const env = EnvService.getInstance();
  return { host: env.redisHost, port: env.redisPort };
}

export class PublicationQueue {
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

export class PublicationWorker {
  private readonly worker: Worker<IPublicationJobData>;

  constructor() {
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

    const publicationRepository = new PrismaPublicationRepository();
    const accountRepository = new PrismaInstagramConnectedAccountRepository();
    const publishingService = new InstagramContentPublishingService();
    const oauthServiceFactory = new InstagramOAuthClientFactory();
    const metaAppConfigRepository = new PrismaMetaAppConfigRepository();
    const tempStorage = new MinioTemporaryPublicationMediaStorage();
    const env = EnvService.getInstance();

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
          (objectKey) => `${env.publicApiUrl}/public/objects/${objectKey}`,
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

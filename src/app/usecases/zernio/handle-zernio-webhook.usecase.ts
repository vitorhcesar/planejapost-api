import { PublicationStatusEnum } from "@/domain/enums/publication.enum";
import type { Publication } from "@/domain/entities/publication.entity";
import type { PublicationTarget } from "@/domain/entities/publication.entity";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";
import type { ILogger } from "@/domain/services/logger.service";
import {
  extractPlatformPostId,
  extractPlatformPublishedUrl,
  extractPostWebhookPlatformEntries,
  extractZernioAccountId,
  extractZernioPostId,
  extractZernioPublicationIdFromMetadata,
  type IZernioPostWebhookPlatformEntry,
} from "@/app/usecases/zernio/parse-zernio-post-webhook-payload.util";

const ZERNIO_WEBHOOK_SCOPE = "Zernio Webhook";

export interface IHandleZernioWebhookInput {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export class HandleZernioWebhookUseCase {
  constructor(
    private readonly zernioWebhookEventRepository: IZernioWebhookEventRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly publicationRepository: IPublicationRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: IHandleZernioWebhookInput): Promise<{ duplicate: boolean }> {
    const existing = await this.zernioWebhookEventRepository.findByEventId(
      input.eventId,
    );

    if (existing) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "Evento duplicado ignorado", {
        evento: input.eventType,
        eventId: input.eventId,
      });
      return { duplicate: true };
    }

    const record = await this.zernioWebhookEventRepository.create({
      eventId: input.eventId,
      eventType: input.eventType,
      payload: input.payload,
    });

    try {
      await this.dispatchEvent(input.eventType, input.payload);
      await this.zernioWebhookEventRepository.markAsProcessed(record.id);
    } catch (error) {
      this.logger.error(ZERNIO_WEBHOOK_SCOPE, "Falha ao processar evento", error, {
        evento: input.eventType,
        eventId: input.eventId,
      });
    }

    return { duplicate: false };
  }

  private async dispatchEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (eventType === "account.connected") {
      await this.handleAccountConnected(payload);
      return;
    }

    if (eventType === "account.disconnected") {
      await this.handleAccountDisconnected(payload);
      return;
    }

    if (
      eventType === "post.platform.published" ||
      eventType === "post.platform.failed" ||
      eventType === "post.published" ||
      eventType === "post.partial" ||
      eventType === "post.failed"
    ) {
      await this.handlePostEvent(eventType, payload);
    }
  }

  private async handleAccountConnected(payload: Record<string, unknown>): Promise<void> {
    const account = payload.account as Record<string, unknown> | undefined;
    const accountId = String(
      account?.accountId ??
        account?._id ??
        (payload.accountId as string | undefined) ??
        "",
    );

    if (!accountId) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.connected sem accountId", {});
      return;
    }

    const existing =
      await this.socialConnectedAccountRepository.findByZernioAccountId(accountId);

    if (existing) {
      existing.updateProfileSnapshot({
        username: typeof account?.username === "string" ? account.username : undefined,
        displayName:
          typeof account?.displayName === "string" ? account.displayName : undefined,
        avatarUrl:
          typeof account?.avatarUrl === "string" ? account.avatarUrl : undefined,
      });
      await this.socialConnectedAccountRepository.save(existing);

      this.logger.info(ZERNIO_WEBHOOK_SCOPE, "Conta conectada/atualizada", {
        zernioAccountId: accountId,
        username: existing.username,
      });
    }
  }

  private async handleAccountDisconnected(payload: Record<string, unknown>): Promise<void> {
    const accountId = String(
      payload.accountId ??
        (payload.account as Record<string, unknown> | undefined)?._id ??
        "",
    );

    if (!accountId) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.disconnected sem accountId", {});
      return;
    }

    const account =
      await this.socialConnectedAccountRepository.findByZernioAccountId(accountId);

    if (!account) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.disconnected — conta não encontrada", {
        zernioAccountId: accountId,
      });
      return;
    }

    account.markAsDisconnected();
    await this.socialConnectedAccountRepository.save(account);
    await this.accountSlotRepository.releaseAccount(account.id);

    this.logger.info(ZERNIO_WEBHOOK_SCOPE, "Conta desconectada", {
      zernioAccountId: accountId,
      socialAccountId: account.id,
    });
  }

  private async resolvePublication(payload: Record<string, unknown>): Promise<Publication | null> {
    const zernioPostId = extractZernioPostId(payload);

    if (zernioPostId) {
      const publication = await this.publicationRepository.findByZernioPostId(zernioPostId);

      if (publication) {
        return publication;
      }
    }

    const publicationId = extractZernioPublicationIdFromMetadata(payload);

    if (!publicationId) {
      return null;
    }

    return this.publicationRepository.findById(publicationId);
  }

  private async handlePostEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const zernioPostId = extractZernioPostId(payload);
    const publication = await this.resolvePublication(payload);

    if (!publication) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "Publicação não encontrada", {
        evento: eventType,
        zernioPostId,
        publicationId: extractZernioPublicationIdFromMetadata(payload),
      });
      return;
    }

    if (eventType === "post.platform.published" || eventType === "post.platform.failed") {
      await this.handlePerPlatformPostEvent(eventType, payload, publication);
      return;
    }

    this.syncTargetsFromPlatformEntries(
      publication,
      extractPostWebhookPlatformEntries(payload),
    );

    if (eventType === "post.published") {
      publication.applyAggregateStatus(PublicationStatusEnum.COMPLETED);
    } else if (eventType === "post.partial") {
      publication.applyAggregateStatus(PublicationStatusEnum.PARTIAL_FAILURE);
    } else if (eventType === "post.failed") {
      publication.applyAggregateStatus(PublicationStatusEnum.FAILED);
    }

    publication.finalizeStatus();
    await this.publicationRepository.save(publication);

    this.logger.info(ZERNIO_WEBHOOK_SCOPE, "Publicação atualizada", {
      evento: eventType,
      publicationId: publication.id,
      status: publication.status,
    });
  }

  private async handlePerPlatformPostEvent(
    eventType: string,
    payload: Record<string, unknown>,
    publication: Publication,
  ): Promise<void> {
    const platformPayload = payload.platform as Record<string, unknown> | undefined;
    const platformBlock = (platformPayload ?? {}) as Record<string, unknown>;
    const zernioAccountId = extractZernioAccountId(payload);

    if (!zernioAccountId) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "post.platform.* sem accountId", {
        evento: eventType,
        publicationId: publication.id,
      });
      return;
    }

    let matched = false;

    const targets = publication.targets.map((target) => {
      if (target.zernioAccountId !== zernioAccountId) {
        return target;
      }

      matched = true;

      if (eventType === "post.platform.published") {
        target.markAsSuccess(
          extractPlatformPostId(platformBlock) ?? "",
          extractPlatformPublishedUrl(platformBlock),
        );
      } else {
        target.markAsFailed(
          String(platformBlock.error ?? payload.error ?? "Falha na publicação"),
          typeof platformBlock.errorCategory === "string"
            ? platformBlock.errorCategory
            : typeof payload.code === "string"
              ? payload.code
              : null,
        );
      }

      return target;
    });

    if (!matched) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "Target não encontrado para accountId", {
        evento: eventType,
        publicationId: publication.id,
        zernioAccountId,
        targets: publication.targets.map((target) => target.zernioAccountId).join(", "),
      });
      return;
    }

    publication.replaceTargets(targets);
    publication.finalizeStatus();
    await this.publicationRepository.save(publication);

    const publishedUrl = extractPlatformPublishedUrl(platformBlock);

    this.logger.info(ZERNIO_WEBHOOK_SCOPE, "Plataforma atualizada", {
      evento: eventType,
      publicationId: publication.id,
      zernioAccountId,
      status: publication.status,
      ...(publishedUrl ? { url: publishedUrl } : {}),
    });
  }

  private syncTargetsFromPlatformEntries(
    publication: Publication,
    platformEntries: IZernioPostWebhookPlatformEntry[],
  ): void {
    if (platformEntries.length === 0) {
      return;
    }

    const targets = publication.targets.map((target) => {
      const entry = platformEntries.find(
        (platformEntry) => platformEntry.accountId === target.zernioAccountId,
      );

      if (!entry) {
        return target;
      }

      return this.applyPlatformEntryToTarget(target, entry);
    });

    publication.replaceTargets(targets);
  }

  private applyPlatformEntryToTarget(
    target: PublicationTarget,
    entry: IZernioPostWebhookPlatformEntry,
  ): PublicationTarget {
    const normalizedStatus = entry.status.toLowerCase();

    if (normalizedStatus === "published" || normalizedStatus === "success") {
      target.markAsSuccess(entry.platformPostId ?? "", entry.publishedUrl);
      return target;
    }

    if (normalizedStatus === "failed" || normalizedStatus === "failure") {
      target.markAsFailed(
        entry.errorMessage ?? "Falha na publicação",
        entry.errorCode,
      );
      return target;
    }

    return target;
  }
}

import { PublicationStatusEnum } from "@/domain/enums/publication.enum";
import { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { Publication } from "@/domain/entities/publication.entity";
import { isSocialPlatform } from "@/domain/enums/social-platform.enum";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";
import {
  alignPendingTargetsWithAggregateStatus,
  syncPublicationTargetsFromPlatformEntries,
} from "@/app/usecases/zernio/sync-publication-from-zernio-post.util";
import {
  extractPlatformPostId,
  extractPlatformPublishedUrl,
  extractPostWebhookPlatformEntries,
  extractZernioAccountId,
  extractZernioPostId,
  extractZernioPublicationIdFromMetadata,
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
    private readonly socialConnectSessionRepository: ISocialConnectSessionRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly publicationRepository: IPublicationRepository,
    private readonly zernioAccountService: IZernioAccountService,
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
      eventType === "post.failed" ||
      eventType === "post.scheduled" ||
      eventType === "post.cancelled" ||
      eventType === "post.publishing"
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
    const profileId = String(account?.profileId ?? payload.profileId ?? "");
    const platformValue = String(account?.platform ?? payload.platform ?? "");
    const username = String(account?.username ?? "");
    const displayName =
      typeof account?.displayName === "string" ? account.displayName : undefined;
    const avatarUrl =
      typeof account?.avatarUrl === "string" ? account.avatarUrl : undefined;

    if (!accountId) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.connected sem accountId", {});
      return;
    }

    const existing =
      await this.socialConnectedAccountRepository.findByZernioAccountId(accountId);

    if (existing) {
      existing.updateProfileSnapshot({
        username: username || undefined,
        displayName,
        avatarUrl,
      });
      await this.socialConnectedAccountRepository.save(existing);

      this.logger.info(ZERNIO_WEBHOOK_SCOPE, "Conta conectada/atualizada", {
        zernioAccountId: accountId,
        username: existing.username,
      });
      return;
    }

    if (!profileId || !isSocialPlatform(platformValue)) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.connected sem profile/plataforma válidos", {
        zernioAccountId: accountId,
        profileId,
        platform: platformValue,
      });
      return;
    }

    const pendingSession =
      await this.socialConnectSessionRepository.findPendingByProfileAndPlatform(
        profileId,
        platformValue,
      );

    if (!pendingSession) {
      this.logger.info(ZERNIO_WEBHOOK_SCOPE, "account.connected sem sessão pendente", {
        zernioAccountId: accountId,
        profileId,
        platform: platformValue,
      });
      return;
    }

    const slot = await this.accountSlotRepository.findByIdAndUserId(
      pendingSession.accountSlotId,
      pendingSession.userId,
    );

    if (!slot) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.connected — slot não encontrado", {
        sessionId: pendingSession.id,
        accountSlotId: pendingSession.accountSlotId,
      });
      return;
    }

    if (slot.socialConnectedAccountId) {
      this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.connected — slot já ocupado", {
        sessionId: pendingSession.id,
        accountSlotId: slot.id,
      });
      return;
    }

    const existingForUser =
      await this.socialConnectedAccountRepository.findByUserIdAndZernioAccountId(
        pendingSession.userId,
        accountId,
      );

    if (existingForUser) {
      const existingAccountSlot =
        await this.accountSlotRepository.findBySocialConnectedAccountId(existingForUser.id);

      if (existingAccountSlot && existingAccountSlot.id !== slot.id) {
        this.logger.warn(ZERNIO_WEBHOOK_SCOPE, "account.connected — conta já vinculada a outro slot", {
          zernioAccountId: accountId,
          userId: pendingSession.userId,
        });
        return;
      }
    }

    const health = await this.zernioAccountService.getAccountHealth(accountId);
    let socialAccount = existingForUser;

    if (socialAccount) {
      socialAccount.reconnect({
        accountSlotId: slot.id,
        username: username || socialAccount.username,
        displayName: displayName ?? socialAccount.displayName,
        avatarUrl: avatarUrl ?? socialAccount.avatarUrl,
        canPost: health.canPost,
        needsReconnect: health.needsReconnect,
        permissions: health.permissions,
      });
    } else {
      socialAccount = SocialConnectedAccount.create({
        userId: pendingSession.userId,
        accountSlotId: slot.id,
        platform: platformValue,
        zernioAccountId: accountId,
        zernioProfileId: profileId,
        username: username || accountId,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
        canPost: health.canPost,
        needsReconnect: health.needsReconnect,
        permissions: health.permissions,
      });
    }

    const savedAccount = await this.socialConnectedAccountRepository.save(socialAccount);
    await this.accountSlotRepository.assignAccount(slot.id, savedAccount.id);

    pendingSession.markAsCompleted();
    await this.socialConnectSessionRepository.save(pendingSession);

    this.logger.info(ZERNIO_WEBHOOK_SCOPE, "Conta conectada via webhook", {
      zernioAccountId: accountId,
      socialAccountId: savedAccount.id,
      sessionId: pendingSession.id,
      platform: platformValue,
    });
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

    syncPublicationTargetsFromPlatformEntries(
      publication,
      extractPostWebhookPlatformEntries(payload),
    );

    if (eventType === "post.published") {
      publication.applyAggregateStatus(PublicationStatusEnum.COMPLETED);
    } else if (eventType === "post.partial") {
      publication.applyAggregateStatus(PublicationStatusEnum.PARTIAL_FAILURE);
    } else if (eventType === "post.failed") {
      publication.applyAggregateStatus(PublicationStatusEnum.FAILED);
    } else if (eventType === "post.scheduled") {
      publication.applyAggregateStatus(PublicationStatusEnum.SCHEDULED);
    } else if (eventType === "post.cancelled") {
      publication.markAsCancelled();
    } else if (eventType === "post.publishing") {
      publication.markAsProcessing();
    }

    alignPendingTargetsWithAggregateStatus(publication);
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
}

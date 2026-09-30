import { PublicationStatusEnum } from "@/domain/enums/publication.enum";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";

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
  ) {}

  async execute(input: IHandleZernioWebhookInput): Promise<{ duplicate: boolean }> {
    const existing = await this.zernioWebhookEventRepository.findByEventId(
      input.eventId,
    );

    if (existing) {
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
      console.error("[Zernio Webhook] Falha ao processar evento", {
        eventId: input.eventId,
        eventType: input.eventType,
        error,
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
    }
  }

  private async handleAccountDisconnected(payload: Record<string, unknown>): Promise<void> {
    const accountId = String(
      payload.accountId ??
        (payload.account as Record<string, unknown> | undefined)?._id ??
        "",
    );

    if (!accountId) {
      return;
    }

    const account =
      await this.socialConnectedAccountRepository.findByZernioAccountId(accountId);

    if (!account) {
      return;
    }

    account.markAsDisconnected();
    await this.socialConnectedAccountRepository.save(account);
    await this.accountSlotRepository.releaseAccount(account.id);
  }

  private async handlePostEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const postPayload = payload.post as Record<string, unknown> | undefined;
    const postId = String(payload.postId ?? postPayload?._id ?? "");

    if (!postId) {
      return;
    }

    const publication = await this.publicationRepository.findByZernioPostId(postId);

    if (!publication) {
      return;
    }

    if (eventType === "post.platform.published" || eventType === "post.platform.failed") {
      const platformPayload = payload.platform as Record<string, unknown> | undefined;
      const zernioAccountId = String(
        platformPayload?.accountId ?? payload.accountId ?? "",
      );

      const targets = publication.targets.map((target) => {
        if (target.zernioAccountId !== zernioAccountId) {
          return target;
        }

        if (eventType === "post.platform.published") {
          target.markAsSuccess(
            String(platformPayload?.platformPostId ?? platformPayload?.postId ?? ""),
            typeof platformPayload?.platformPostUrl === "string"
              ? platformPayload.platformPostUrl
              : typeof platformPayload?.url === "string"
                ? platformPayload.url
                : null,
          );
        } else {
          target.markAsFailed(
            String(platformPayload?.errorMessage ?? payload.error ?? "Falha na publicação"),
            typeof platformPayload?.errorCode === "string"
              ? platformPayload.errorCode
              : typeof payload.code === "string"
                ? payload.code
                : null,
          );
        }

        return target;
      });

      publication.replaceTargets(targets);
      publication.finalizeStatus();
      await this.publicationRepository.save(publication);
      return;
    }

    if (eventType === "post.published") {
      publication.applyAggregateStatus(PublicationStatusEnum.COMPLETED);
    } else if (eventType === "post.partial") {
      publication.applyAggregateStatus(PublicationStatusEnum.PARTIAL_FAILURE);
    } else if (eventType === "post.failed") {
      publication.applyAggregateStatus(PublicationStatusEnum.FAILED);
    }

    await this.publicationRepository.save(publication);
  }
}

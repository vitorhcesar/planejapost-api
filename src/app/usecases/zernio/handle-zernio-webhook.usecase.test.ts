import { describe, expect, test } from "bun:test";
import { HandleZernioWebhookUseCase } from "@/app/usecases/zernio/handle-zernio-webhook.usecase";
import { Publication } from "@/domain/entities/publication.entity";
import { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import { SocialConnectSession } from "@/domain/entities/social-connect-session.entity";
import { ConnectModeEnum } from "@/domain/enums/connect-mode.enum";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type { IAccountSlot, IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";
import { NoopLogger } from "@/infra/logging/noop-logger.service";

class InMemoryPublicationRepository implements IPublicationRepository {
  constructor(private publication: Publication | null) {}

  async findByZernioPostId(zernioPostId: string) {
    if (this.publication?.zernioPostId === zernioPostId) {
      return this.publication;
    }

    return null;
  }

  async findById(id: string) {
    return this.publication?.id === id ? this.publication : null;
  }

  async findByIdAndUserId(id: string) {
    return this.findById(id);
  }

  async findAllByUserId() {
    return this.publication ? [this.publication] : [];
  }

  async findAllByUserIdWithFilters() {
    return this.findAllByUserId();
  }

  async save(publication: Publication) {
    this.publication = publication;
    return publication;
  }

  async countByType() {
    return this.publication ? 1 : 0;
  }
}

class StubWebhookEventRepository implements IZernioWebhookEventRepository {
  async findByEventId() {
    return null;
  }

  async create(input: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }) {
    return {
      id: "event-1",
      eventId: input.eventId,
      eventType: input.eventType,
      payload: input.payload,
      processedAt: null,
      createdAt: new Date(),
    };
  }

  async markAsProcessed() {}
}

class InMemorySocialConnectSessionRepository implements ISocialConnectSessionRepository {
  constructor(private readonly session: SocialConnectSession | null) {}

  async create(session: SocialConnectSession) {
    return session;
  }

  async findById() {
    return this.session;
  }

  async findByIdAndUserId() {
    return this.session;
  }

  async findByState() {
    return null;
  }

  async findPendingByProfileAndPlatform(zernioProfileId: string, platform: SocialPlatformEnum) {
    if (
      this.session &&
      this.session.zernioProfileId === zernioProfileId &&
      this.session.platform === platform &&
      !this.session.isCompleted() &&
      !this.session.isExpired()
    ) {
      return this.session;
    }

    return null;
  }

  async save(session: SocialConnectSession) {
    return session;
  }

  async deleteById() {}
}

class InMemorySocialConnectedAccountRepository implements ISocialConnectedAccountRepository {
  private account: SocialConnectedAccount | null = null;

  async findById() {
    return this.account;
  }

  async findByIdAndUserId() {
    return this.account;
  }

  async findByUserId() {
    return this.account ? [this.account] : [];
  }

  async findByUserIdAndZernioAccountId(_userId: string, zernioAccountId: string) {
    return this.account?.zernioAccountId === zernioAccountId ? this.account : null;
  }

  async findByZernioAccountId(zernioAccountId: string) {
    return this.account?.zernioAccountId === zernioAccountId ? this.account : null;
  }

  async findConnectedByUserId() {
    return [];
  }

  async findConnectedByWorkspaceId() {
    return [];
  }

  async save(account: SocialConnectedAccount) {
    this.account = account;
    if (!account.id) {
      account.setId("social-created-1");
    }
    return account;
  }

  async countAll() {
    return this.account ? 1 : 0;
  }

  async countByStatus() {
    return this.account ? 1 : 0;
  }
}

class InMemoryAccountSlotRepository implements IAccountSlotRepository {
  assignedAccountId: string | null = null;

  constructor(
    private readonly slot: IAccountSlot,
  ) {}

  async expireOverdueSlots() {}

  async findByIdAndUserId(id: string, userId: string) {
    if (this.slot.id === id && this.slot.userId === userId) {
      return this.slot;
    }

    return null;
  }

  async findByUserId() {
    return [];
  }

  async findBySocialConnectedAccountId() {
    return null;
  }

  async createMany() {
    return [];
  }

  async assignAccount(slotId: string, accountId: string) {
    if (this.slot.id === slotId) {
      this.slot.socialConnectedAccountId = accountId;
      this.assignedAccountId = accountId;
    }

    return this.slot;
  }

  async releaseAccount() {}

  async renew() {
    return this.slot;
  }
}

class StubZernioAccountService implements IZernioAccountService {
  async listAccounts() {
    return [];
  }

  async getAccountHealth() {
    return {
      accountId: "zernio-acc-1",
      canPost: true,
      needsReconnect: false,
      permissions: null,
    };
  }

  async disconnectAccount() {}
}

const noopLogger = new NoopLogger();

function createProcessingPublication(
  input: {
    targets?: Array<{
      socialConnectedAccountId: string;
      platform: SocialPlatformEnum;
      zernioAccountId: string;
    }>;
  } = {},
): Publication {
  const publication = Publication.create({
    userId: "user-1",
    type: PublicationTypeEnum.POST,
    destinationScope: PublicationDestinationScopeEnum.ALL,
    caption: "Teste",
    mediaUrl: "https://cdn.example/media.jpg",
    objectKey: "https://cdn.example/media.jpg",
    objectKeys: ["https://cdn.example/media.jpg"],
    targets:
      input.targets ?? [
        {
          socialConnectedAccountId: "social-1",
          platform: SocialPlatformEnum.INSTAGRAM,
          zernioAccountId: "zernio-acc-1",
        },
      ],
  });

  publication.setId("pub-1");
  publication.markAsProcessing();
  publication.setZernioPostId("zernio-post-1");

  return publication;
}

function createPendingSession(): SocialConnectSession {
  const session = SocialConnectSession.create({
    userId: "user-1",
    workspaceId: "workspace-1",
    accountSlotId: "slot-1",
    platform: SocialPlatformEnum.TIKTOK,
    zernioProfileId: "profile-1",
    mode: ConnectModeEnum.STANDARD,
    state: "state-1",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  session.setId("session-1");
  return session;
}

function createSlot(): IAccountSlot {
  return {
    id: "slot-1",
    userId: "user-1",
    socialConnectedAccountId: null,
    status: AccountSlotStatusEnum.ACTIVE,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createUseCase(input: {
  publicationRepository: InMemoryPublicationRepository;
  socialConnectedAccountRepository: InMemorySocialConnectedAccountRepository;
  socialConnectSessionRepository: InMemorySocialConnectSessionRepository;
  accountSlotRepository: InMemoryAccountSlotRepository;
}) {
  return new HandleZernioWebhookUseCase(
    new StubWebhookEventRepository(),
    input.socialConnectedAccountRepository,
    input.socialConnectSessionRepository,
    input.accountSlotRepository,
    input.publicationRepository,
    new StubZernioAccountService(),
    noopLogger,
  );
}

describe("HandleZernioWebhookUseCase post events", () => {
  test("updates target on post.platform.published using Zernio payload shape", async () => {
    const publication = createProcessingPublication();
    const repository = new InMemoryPublicationRepository(publication);
    const useCase = createUseCase({
      publicationRepository: repository,
      socialConnectedAccountRepository: new InMemorySocialConnectedAccountRepository(),
      socialConnectSessionRepository: new InMemorySocialConnectSessionRepository(null),
      accountSlotRepository: new InMemoryAccountSlotRepository(createSlot()),
    });

    await useCase.execute({
      eventId: "evt-1",
      eventType: "post.platform.published",
      payload: {
        post: { id: "zernio-post-1" },
        account: {
          accountId: "zernio-acc-1",
          platform: "instagram",
          username: "isaac.new.cesar",
        },
        platform: {
          name: "instagram",
          status: "published",
          platformPostId: "ig-post-1",
          publishedUrl: "https://instagram.com/p/abc",
        },
      },
    });

    const saved = await repository.findById("pub-1");

    expect(saved?.status).toBe(PublicationStatusEnum.COMPLETED);
    expect(saved?.targets[0]?.status).toBe(PublicationTargetStatusEnum.SUCCESS);
    expect(saved?.targets[0]?.platformPostUrl).toBe("https://instagram.com/p/abc");
  });

  test("marks publication as partial_failure on post.partial", async () => {
    const publication = createProcessingPublication({
      targets: [
        {
          socialConnectedAccountId: "social-1",
          platform: SocialPlatformEnum.INSTAGRAM,
          zernioAccountId: "zernio-acc-1",
        },
        {
          socialConnectedAccountId: "social-2",
          platform: SocialPlatformEnum.LINKEDIN,
          zernioAccountId: "zernio-acc-2",
        },
      ],
    });
    const repository = new InMemoryPublicationRepository(publication);
    const useCase = createUseCase({
      publicationRepository: repository,
      socialConnectedAccountRepository: new InMemorySocialConnectedAccountRepository(),
      socialConnectSessionRepository: new InMemorySocialConnectSessionRepository(null),
      accountSlotRepository: new InMemoryAccountSlotRepository(createSlot()),
    });

    await useCase.execute({
      eventId: "evt-partial-1",
      eventType: "post.partial",
      payload: {
        post: {
          id: "zernio-post-1",
          status: "partial",
          platforms: [
            {
              platform: "instagram",
              status: "published",
              accountId: "zernio-acc-1",
              platformPostId: "ig-post-1",
              publishedUrl: "https://instagram.com/p/abc",
            },
            {
              platform: "linkedin",
              status: "failed",
              accountId: "zernio-acc-2",
              error: "LinkedIn rejected the post",
              errorCode: "platform_error",
            },
          ],
        },
      },
    });

    const saved = await repository.findById("pub-1");

    expect(saved?.status).toBe(PublicationStatusEnum.PARTIAL_FAILURE);
    expect(saved?.targets[0]?.status).toBe(PublicationTargetStatusEnum.SUCCESS);
    expect(saved?.targets[1]?.status).toBe(PublicationTargetStatusEnum.FAILED);
    expect(saved?.targets[1]?.errorMessage).toBe("LinkedIn rejected the post");
  });

  test("updates targets and aggregate status on post.published", async () => {
    const publication = createProcessingPublication();
    const repository = new InMemoryPublicationRepository(publication);
    const useCase = createUseCase({
      publicationRepository: repository,
      socialConnectedAccountRepository: new InMemorySocialConnectedAccountRepository(),
      socialConnectSessionRepository: new InMemorySocialConnectSessionRepository(null),
      accountSlotRepository: new InMemoryAccountSlotRepository(createSlot()),
    });

    await useCase.execute({
      eventId: "evt-2",
      eventType: "post.published",
      payload: {
        post: {
          id: "zernio-post-1",
          platforms: [
            {
              platform: "instagram",
              status: "published",
              accountId: "zernio-acc-1",
              platformPostId: "ig-post-1",
              publishedUrl: "https://instagram.com/p/abc",
            },
          ],
        },
      },
    });

    const saved = await repository.findById("pub-1");

    expect(saved?.status).toBe(PublicationStatusEnum.COMPLETED);
    expect(saved?.targets[0]?.status).toBe(PublicationTargetStatusEnum.SUCCESS);
  });
});

describe("HandleZernioWebhookUseCase account.connected", () => {
  test("creates social account from pending connect session", async () => {
    const session = createPendingSession();
    const socialRepository = new InMemorySocialConnectedAccountRepository();
    const slotRepository = new InMemoryAccountSlotRepository(createSlot());
    const useCase = createUseCase({
      publicationRepository: new InMemoryPublicationRepository(null),
      socialConnectedAccountRepository: socialRepository,
      socialConnectSessionRepository: new InMemorySocialConnectSessionRepository(session),
      accountSlotRepository: slotRepository,
    });

    await useCase.execute({
      eventId: "evt-account-1",
      eventType: "account.connected",
      payload: {
        account: {
          accountId: "zernio-acc-1",
          profileId: "profile-1",
          platform: "tiktok",
          username: "creator.tiktok",
          displayName: "Creator TikTok",
        },
      },
    });

    const saved = await socialRepository.findByZernioAccountId("zernio-acc-1");

    expect(saved?.platform).toBe(SocialPlatformEnum.TIKTOK);
    expect(saved?.username).toBe("creator.tiktok");
    expect(saved?.status).toBe(SocialAccountStatusEnum.CONNECTED);
    expect(session.isCompleted()).toBe(true);
    expect(slotRepository.assignedAccountId).toBe("social-created-1");
  });
});

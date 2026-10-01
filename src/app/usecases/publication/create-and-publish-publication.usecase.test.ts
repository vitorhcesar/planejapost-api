import { describe, expect, it } from "bun:test";
import { CreateAndPublishPublicationUseCase } from "@/app/usecases/publication/create-and-publish-publication.usecase";
import { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationTypeEnum,
  PublishModeEnum,
} from "@/domain/enums/publication.enum";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import { AppError } from "@/domain/errors/app.error";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IUserZernioQueueRepository } from "@/domain/repositories/user-zernio-queue.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import { Workspace } from "@/domain/entities/workspace.entity";
import type { EnsureDefaultWorkspaceUseCase } from "@/app/usecases/workspace/workspace.usecases";
import { User } from "@/domain/entities/user.entity";
import { UserZernioQueue } from "@/domain/entities/user-zernio-queue.entity";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import type { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";

const MEDIA_URL = "https://media.example.com/file.jpg";

class InMemoryPublicationRepository implements IPublicationRepository {
  publications: Publication[] = [];

  async findById(id: string) {
    return this.publications.find((item) => item.id === id) ?? null;
  }

  async findByIdAndUserId(id: string, userId: string) {
    return (
      this.publications.find(
        (item) => item.id === id && item.toObject().userId === userId,
      ) ?? null
    );
  }

  async findByZernioPostId() {
    return null;
  }

  async findAllByUserId(userId: string) {
    return this.publications.filter(
      (item) => item.toObject().userId === userId,
    );
  }

  async findAllByUserIdWithFilters(userId: string, filters: { status?: string }) {
    return this.findAllByUserId(userId).then((items) =>
      filters.status
        ? items.filter((item) => item.status === filters.status)
        : items,
    );
  }

  async save(publication: Publication) {
    const saved = publication.id
      ? publication
      : Publication.restore({
          ...publication.toObject(),
          id: `pub-${this.publications.length + 1}`,
        });
    this.publications = [
      ...this.publications.filter((item) => item.id !== saved.id),
      saved,
    ];
    return saved;
  }

  async countByType() {
    return 0;
  }
}

class InMemorySocialAccountRepository implements ISocialConnectedAccountRepository {
  accounts: SocialConnectedAccount[] = [];

  async findById(id: string) {
    return this.accounts.find((account) => account.id === id) ?? null;
  }

  async findByIdAndUserId(id: string, userId: string) {
    return (
      this.accounts.find((account) => account.id === id && account.userId === userId) ??
      null
    );
  }

  async findByUserId(userId: string) {
    return this.accounts.filter((account) => account.userId === userId);
  }

  async findConnectedByWorkspaceId(workspaceId: string) {
    return this.accounts.filter(
      (account) => account.workspaceId === workspaceId && account.isConnected(),
    );
  }

  async findByUserIdAndZernioAccountId() {
    return null;
  }

  async findByZernioAccountId() {
    return null;
  }

  async findConnectedByUserId(userId: string) {
    return this.accounts.filter(
      (account) => account.userId === userId && account.isConnected(),
    );
  }

  async save(account: SocialConnectedAccount) {
    const saved = account.id
      ? account
      : SocialConnectedAccount.restore({
          ...account.toObject(),
          id: `social-${this.accounts.length + 1}`,
        });
    this.accounts = [
      ...this.accounts.filter((item) => item.id !== saved.id),
      saved,
    ];
    return saved;
  }

  async countAll() {
    return this.accounts.length;
  }

  async countByStatus() {
    return this.accounts.length;
  }
}

class MockZernioPostService implements IZernioPostService {
  calls: Parameters<IZernioPostService["createPost"]>[0][] = [];
  nextResponse: Awaited<ReturnType<IZernioPostService["createPost"]>> = {
    postId: "zernio-post-1",
    status: "publishing",
    scheduledFor: null,
    timezone: null,
    platforms: [],
  };
  nextError: unknown = null;

  async createPost(input: Parameters<IZernioPostService["createPost"]>[0]) {
    this.calls.push(input);

    if (this.nextError) {
      throw this.nextError;
    }

    return this.nextResponse;
  }

  async getPost() {
    return null;
  }

  async cancelPost() {}

  async updatePost() {
    return {
      postId: "zernio-post-1",
      status: "scheduled",
      scheduledFor: null,
      timezone: null,
      platforms: [],
    };
  }
}

const DEFAULT_WORKSPACE = Workspace.restore({
  id: "workspace-1",
  userId: "user-1",
  name: "Meu workspace",
  slug: "meu-workspace",
  description: null,
  color: null,
  isDefault: true,
  archivedAt: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function createConnectedAccount(
  userId: string,
  overrides: Partial<{
    id: string;
    platform: SocialPlatformEnum;
    zernioAccountId: string;
    username: string;
    canPost: boolean;
  }> = {},
) {
  return SocialConnectedAccount.restore({
    id: overrides.id ?? "social-1",
    userId,
    workspaceId: DEFAULT_WORKSPACE.id,
    accountSlotId: "slot-1",
    platform: overrides.platform ?? SocialPlatformEnum.INSTAGRAM,
    zernioAccountId: overrides.zernioAccountId ?? "zernio-acc-1",
    zernioProfileId: "zernio-profile-1",
    username: overrides.username ?? "jane",
    displayName: "Jane",
    avatarUrl: null,
    status: SocialAccountStatusEnum.CONNECTED,
    canPost: overrides.canPost ?? true,
    needsReconnect: false,
    permissions: null,
    connectedAt: new Date(),
    disconnectedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createUseCase(input: {
  publicationRepository?: InMemoryPublicationRepository;
  socialRepository?: InMemorySocialAccountRepository;
  zernioPostService?: MockZernioPostService;
  userZernioQueueRepository?: IUserZernioQueueRepository;
}) {
  return new CreateAndPublishPublicationUseCase(
    input.publicationRepository ?? new InMemoryPublicationRepository(),
    input.socialRepository ?? new InMemorySocialAccountRepository(),
    {
      findActiveByIdAndUserId: async (workspaceId: string, userId: string) =>
        workspaceId === DEFAULT_WORKSPACE.id && userId === "user-1"
          ? DEFAULT_WORKSPACE
          : null,
      findById: async (workspaceId: string) =>
        workspaceId === DEFAULT_WORKSPACE.id ? DEFAULT_WORKSPACE : null,
    } as unknown as IWorkspaceRepository,
    {
      execute: async () => DEFAULT_WORKSPACE,
    } as unknown as EnsureDefaultWorkspaceUseCase,
    {
      findById: async (userId: string) =>
        User.restore({
          id: userId,
          name: "Jane",
          email: "jane@example.com",
          emailVerified: true,
          image: null,
          role: AppRoleEnum.CLIENT,
          zernioProfileId: "zernio-profile-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    } as unknown as IUserRepository,
    input.userZernioQueueRepository ??
      ({
        findByUserId: async () => null,
        save: async (queue: UserZernioQueue) => queue,
      } as unknown as IUserZernioQueueRepository),
    {
      execute: async () => "zernio-profile-1",
    } as unknown as EnsureZernioProfileUseCase,
    input.zernioPostService ?? new MockZernioPostService(),
    {
      execute: async () => ({
        id: "sub-1",
        userId: "user-1",
        planId: "growth",
        status: "active",
        preferredPaymentMethod: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: null,
        cancelAtPeriodEnd: false,
        scheduledPlanId: null,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: "growth",
          name: "Crescimento",
          priceMonthlyBrl: 179,
          connectionsLimit: 10,
          postsPerMonthLimit: 1800,
          features: {},
        },
      }),
    } as never,
  );
}

describe("CreateAndPublishPublicationUseCase", () => {
  it("fails when there are no connected social accounts", async () => {
    const useCase = createUseCase({});

    try {
      await useCase.execute("user-1", {
        type: PublicationTypeEnum.POST,
        destinationScope: PublicationDestinationScopeEnum.ALL,
        mediaUrl: MEDIA_URL,
      });
      throw new Error("Expected publication to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("no_social_accounts_available");
    }
  });

  it("fails when media is missing", async () => {
    const socialRepository = new InMemorySocialAccountRepository();
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const useCase = createUseCase({ socialRepository });

    try {
      await useCase.execute("user-1", {
        type: PublicationTypeEnum.POST,
        destinationScope: PublicationDestinationScopeEnum.ALL,
      });
      throw new Error("Expected publication to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("media_required");
    }
  });

  it("rejects legacy minio object keys", async () => {
    const socialRepository = new InMemorySocialAccountRepository();
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const useCase = createUseCase({ socialRepository });

    try {
      await useCase.execute("user-1", {
        type: PublicationTypeEnum.POST,
        destinationScope: PublicationDestinationScopeEnum.ALL,
        mediaUrl: "temp/user-1/file.jpg",
      });
      throw new Error("Expected publication to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("invalid_media_url");
    }
  });

  it("publishes carousel with multiple media urls", async () => {
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const useCase = createUseCase({ socialRepository, zernioPostService });

    await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      mediaUrls: [
        "https://media.example.com/1.jpg",
        "https://media.example.com/2.jpg",
        "https://media.example.com/3.jpg",
      ],
    });

    const payload = zernioPostService.calls[0]!;

    expect(payload.mediaItems).toHaveLength(3);
  });

  it("publishes instagram story with platform specific data", async () => {
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const useCase = createUseCase({ socialRepository, zernioPostService });

    await useCase.execute("user-1", {
      type: PublicationTypeEnum.STORY,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      mediaUrl: MEDIA_URL,
    });

    const payload = zernioPostService.calls[0]!;

    expect(payload.platforms[0]?.platformSpecificData).toEqual({
      contentType: "story",
    });
  });

  it("publishes to multiple platforms in one zernio post", async () => {
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    socialRepository.accounts = [
      createConnectedAccount("user-1", {
        id: "social-ig",
        platform: SocialPlatformEnum.INSTAGRAM,
        zernioAccountId: "zernio-ig-1",
        username: "jane.ig",
      }),
      createConnectedAccount("user-1", {
        id: "social-li",
        platform: SocialPlatformEnum.LINKEDIN,
        zernioAccountId: "zernio-li-1",
        username: "jane.li",
      }),
    ];

    const useCase = createUseCase({ socialRepository, zernioPostService });

    await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.SELECTED,
      socialConnectedAccountIds: ["social-ig", "social-li"],
      mediaUrl: MEDIA_URL,
      caption: "Cross-post",
    });

    const payload = zernioPostService.calls[0]!;

    expect(payload.platforms).toHaveLength(2);
    expect(payload.platforms.map((platform) => platform.accountId)).toEqual([
      "zernio-ig-1",
      "zernio-li-1",
    ]);
  });

  it("reuses existing zernio post id on 409 content dedup", async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    socialRepository.accounts = [createConnectedAccount("user-1")];
    zernioPostService.nextError = new AppError(
      "Conteúdo duplicado",
      409,
      "idempotency_conflict",
      { existingPostId: "zernio-existing-post" },
    );

    const useCase = createUseCase({
      publicationRepository,
      socialRepository,
      zernioPostService,
    });

    const result = await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      mediaUrl: MEDIA_URL,
    });

    expect(result.zernioPostId).toBe("zernio-existing-post");
    expect(publicationRepository.publications[0]?.zernioPostId).toBe(
      "zernio-existing-post",
    );
  });

  it("sends persisted idempotency key to zernio", async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const useCase = createUseCase({
      publicationRepository,
      socialRepository,
      zernioPostService,
    });

    await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      mediaUrl: MEDIA_URL,
    });

    const savedPublication = publicationRepository.publications[0]!;
    const payload = zernioPostService.calls[0]!;

    expect(payload.idempotencyKey).toBe(savedPublication.idempotencyKey);
    expect(payload.idempotencyKey.length).toBeGreaterThan(0);
  });

  it("blocks publication when canPost is false", async () => {
    const socialRepository = new InMemorySocialAccountRepository();
    socialRepository.accounts = [
      createConnectedAccount("user-1", { canPost: false }),
    ];

    const useCase = createUseCase({ socialRepository });

    try {
      await useCase.execute("user-1", {
        type: PublicationTypeEnum.POST,
        destinationScope: PublicationDestinationScopeEnum.ALL,
        mediaUrl: MEDIA_URL,
      });
      throw new Error("Expected publication to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("platform_post_not_allowed");
    }
  });

  it("creates and publishes via Zernio", async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const useCase = createUseCase({
      publicationRepository,
      socialRepository,
      zernioPostService,
    });

    const result = await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      mediaUrl: MEDIA_URL,
      caption: "Hello",
    });

    expect(result.id).toBe("pub-1");
    expect(result.zernioPostId).toBe("zernio-post-1");
    expect(zernioPostService.calls).toHaveLength(1);
    expect(publicationRepository.publications).toHaveLength(1);
  });

  it("stores queue timezone when Zernio returns UTC", async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    const socialRepository = new InMemorySocialAccountRepository();
    const zernioPostService = new MockZernioPostService();
    zernioPostService.nextResponse = {
      postId: "zernio-post-queued",
      status: "scheduled",
      scheduledFor: "2026-09-30T18:50:00.000Z",
      timezone: "UTC",
      platforms: [],
    };
    socialRepository.accounts = [createConnectedAccount("user-1")];

    const queue = UserZernioQueue.restore({
      id: "queue-1",
      userId: "user-1",
      zernioProfileId: "zernio-profile-1",
      zernioQueueId: "zernio-queue-1",
      name: "Default",
      timezone: "America/Sao_Paulo",
      slots: [{ dayOfWeek: 1, time: "15:50" }],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const useCase = createUseCase({
      publicationRepository,
      socialRepository,
      zernioPostService,
      userZernioQueueRepository: {
        findByUserId: async () => queue,
        save: async (savedQueue: UserZernioQueue) => savedQueue,
      } as unknown as IUserZernioQueueRepository,
    });

    const result = await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      mediaUrl: MEDIA_URL,
      publishMode: PublishModeEnum.QUEUED,
    });

    expect(result.publishMode).toBe(PublishModeEnum.QUEUED);
    expect(result.timezone).toBe("America/Sao_Paulo");
    expect(result.scheduledFor).toBe("2026-09-30T18:50:00.000Z");
  });
});

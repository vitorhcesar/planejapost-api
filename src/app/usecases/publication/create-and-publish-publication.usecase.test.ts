import { Readable } from "node:stream";
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
import type { IZernioMediaService } from "@/domain/zernio/zernio-media.service";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import type { ITemporaryPublicationMediaStorage } from "@/domain/storages/temporary-publication-media.storage";
import { User } from "@/domain/entities/user.entity";
import { UserZernioQueue } from "@/domain/entities/user-zernio-queue.entity";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import type { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";

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
  calls: unknown[] = [];
  nextResponse: Awaited<ReturnType<IZernioPostService["createPost"]>> = {
    postId: "zernio-post-1",
    status: "publishing",
    scheduledFor: null,
    timezone: null,
    platforms: [],
  };

  async createPost(input: Parameters<IZernioPostService["createPost"]>[0]) {
    this.calls.push(input);
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

class MockZernioMediaService implements IZernioMediaService {
  async presignUpload() {
    return {
      uploadUrl: "https://upload.example.com",
      publicUrl: "https://media.example.com/file.jpg",
    };
  }

  async uploadToPresignedUrl() {}
}

class MockTemporaryMediaStorage implements ITemporaryPublicationMediaStorage {
  async upload() {}

  async getStream(objectKey: string) {
    return {
      stream: Readable.from([Buffer.from("image-data")]),
      contentType: "image/jpeg",
      size: 10,
    };
  }

  async delete() {}

  buildObjectKey(userId: string, originalFilename: string) {
    return `temp/${userId}/${originalFilename}`;
  }
}

function createConnectedAccount(userId: string) {
  return SocialConnectedAccount.restore({
    id: "social-1",
    userId,
    accountSlotId: "slot-1",
    platform: SocialPlatformEnum.INSTAGRAM,
    zernioAccountId: "zernio-acc-1",
    zernioProfileId: "zernio-profile-1",
    username: "jane",
    displayName: "Jane",
    avatarUrl: null,
    status: SocialAccountStatusEnum.CONNECTED,
    canPost: true,
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
    new MockZernioMediaService(),
    new MockTemporaryMediaStorage(),
  );
}

describe("CreateAndPublishPublicationUseCase", () => {
  it("fails when there are no connected social accounts", async () => {
    const useCase = createUseCase({});

    try {
      await useCase.execute("user-1", {
        type: PublicationTypeEnum.POST,
        destinationScope: PublicationDestinationScopeEnum.ALL,
        objectKey: "temp/user-1/file.jpg",
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
      objectKey: "temp/user-1/file.jpg",
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
      objectKey: "temp/user-1/file.jpg",
      publishMode: PublishModeEnum.QUEUED,
    });

    expect(result.publishMode).toBe(PublishModeEnum.QUEUED);
    expect(result.timezone).toBe("America/Sao_Paulo");
    expect(result.scheduledFor).toBe("2026-09-30T18:50:00.000Z");
  });
});

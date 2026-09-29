import { describe, expect, it } from "bun:test";
import { CreateAndPublishPublicationUseCase } from "@/app/usecases/publication/create-and-publish-publication.usecase";
import { InstagramConnectedAccount } from "@/domain/entities/instagram-connected-account.entity";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationTypeEnum,
} from "@/domain/enums/instagram.enum";
import { AppError } from "@/domain/errors/app.error";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type { IPublicationQueue } from "@/domain/queue/publication-queue";
import type { IInstagramConnectedAccountRepository } from "@/domain/repositories/instagram-connected-account.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";

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

  async findAllByUserId(userId: string) {
    return this.publications.filter(
      (item) => item.toObject().userId === userId,
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

class InMemoryInstagramAccountRepository {
  accounts: InstagramConnectedAccount[] = [];

  async findByUserId(userId: string) {
    return this.accounts.filter((account) => account.userId === userId);
  }

  async findById(id: string) {
    return this.accounts.find((account) => account.id === id) ?? null;
  }

  async findByInstagramUserId() {
    return null;
  }

  async save(account: InstagramConnectedAccount) {
    const saved = account.id
      ? account
      : InstagramConnectedAccount.restore({
          ...account.toObject(),
          id: `ig-${this.accounts.length + 1}`,
        });
    this.accounts = [
      ...this.accounts.filter((item) => item.id !== saved.id),
      saved,
    ];
    return saved;
  }

  async delete() {}

  async countAll() {
    return this.accounts.length;
  }
}

class InMemoryPublicationQueue implements IPublicationQueue {
  enqueued: string[] = [];

  async enqueue(publicationId: string) {
    this.enqueued.push(publicationId);
  }
}

const publicApiConfig: IPublicApiConfig = {
  publicApiUrl: "https://api.example.com",
};

function createConnectedAccount(userId: string) {
  const now = new Date(Date.now() + 60_000);

  return InstagramConnectedAccount.restore({
    id: "ig-1",
    userId,
    instagramUserId: "instagram-user-1",
    username: "jane",
    displayName: "Jane",
    profilePictureUrl: null,
    accessToken: "token",
    tokenExpiresAt: now,
    scopes: ["instagram_business_basic"],
    status: "connected" as never,
    integrationSource: "user_meta_app",
    metaAppConfigId: "meta-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("CreateAndPublishPublicationUseCase", () => {
  it("fails when there are no connected instagram accounts", async () => {
    const useCase = new CreateAndPublishPublicationUseCase(
      new InMemoryPublicationRepository(),
      new InMemoryInstagramAccountRepository() as unknown as IInstagramConnectedAccountRepository,
      new InMemoryPublicationQueue(),
      publicApiConfig,
    );

    try {
      await useCase.execute("user-1", {
        type: PublicationTypeEnum.POST,
        destinationScope: PublicationDestinationScopeEnum.ALL,
        objectKey: "temp/user-1/file.jpg",
      });
      throw new Error("Expected publication to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("no_instagram_accounts_available");
    }
  });

  it("fails when media is missing", async () => {
    const instagramRepositoryImpl = new InMemoryInstagramAccountRepository();
    instagramRepositoryImpl.accounts = [createConnectedAccount("user-1")];

    const useCase = new CreateAndPublishPublicationUseCase(
      new InMemoryPublicationRepository(),
      instagramRepositoryImpl as unknown as IInstagramConnectedAccountRepository,
      new InMemoryPublicationQueue(),
      publicApiConfig,
    );

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

  it("saves and enqueues a publication with media", async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    const instagramRepositoryImpl = new InMemoryInstagramAccountRepository();
    const queue = new InMemoryPublicationQueue();
    instagramRepositoryImpl.accounts = [createConnectedAccount("user-1")];

    const useCase = new CreateAndPublishPublicationUseCase(
      publicationRepository,
      instagramRepositoryImpl as unknown as IInstagramConnectedAccountRepository,
      queue,
      publicApiConfig,
    );

    const result = await useCase.execute("user-1", {
      type: PublicationTypeEnum.POST,
      destinationScope: PublicationDestinationScopeEnum.ALL,
      objectKey: "temp/user-1/file.jpg",
      caption: "Hello",
    });

    expect(result.id).toBe("pub-1");
    expect(queue.enqueued).toEqual(["pub-1"]);
    expect(publicationRepository.publications).toHaveLength(1);
  });
});

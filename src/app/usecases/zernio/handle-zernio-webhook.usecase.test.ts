import { describe, expect, test } from "bun:test";
import { HandleZernioWebhookUseCase } from "@/app/usecases/zernio/handle-zernio-webhook.usecase";
import { NoopLogger } from "@/infra/logging/noop-logger.service";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IZernioWebhookEventRepository } from "@/domain/repositories/zernio-webhook-event.repository";

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

const noopSocialRepo = {} as ISocialConnectedAccountRepository;
const noopSlotRepo = {} as IAccountSlotRepository;

function createProcessingPublication(): Publication {
  const publication = Publication.create({
    userId: "user-1",
    type: PublicationTypeEnum.POST,
    destinationScope: PublicationDestinationScopeEnum.ALL,
    caption: "Teste",
    mediaUrl: "https://cdn.example/media.jpg",
    objectKey: "temp/media.jpg",
    objectKeys: ["temp/media.jpg"],
    targets: [
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

const noopLogger = new NoopLogger();

describe("HandleZernioWebhookUseCase post events", () => {
  test("updates target on post.platform.published using Zernio payload shape", async () => {
    const publication = createProcessingPublication();
    const repository = new InMemoryPublicationRepository(publication);
    const useCase = new HandleZernioWebhookUseCase(
      new StubWebhookEventRepository(),
      noopSocialRepo,
      noopSlotRepo,
      repository,
      noopLogger,
    );

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

  test("updates targets and aggregate status on post.published", async () => {
    const publication = createProcessingPublication();
    const repository = new InMemoryPublicationRepository(publication);
    const useCase = new HandleZernioWebhookUseCase(
      new StubWebhookEventRepository(),
      noopSocialRepo,
      noopSlotRepo,
      repository,
      noopLogger,
    );

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

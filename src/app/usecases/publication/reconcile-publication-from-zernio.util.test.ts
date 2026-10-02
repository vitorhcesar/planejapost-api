import { describe, expect, test } from "bun:test";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import { reconcilePublicationFromZernio } from "@/app/usecases/publication/reconcile-publication-from-zernio.util";
import { NoopLogger } from "@/infra/logging/noop-logger.service";

class InMemoryPublicationRepository implements IPublicationRepository {
  constructor(private publication: Publication | null) {}

  async findByZernioPostId() {
    return this.publication;
  }

  async findById(id: string) {
    return this.publication?.id === id ? this.publication : null;
  }

  async findByIdAndUserId(id: string) {
    return this.findById(id);
  }

  async findAnalyticsEligibleByZernioAccountId() {
    return [];
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

class StubZernioPostService implements IZernioPostService {
  constructor(private readonly post: Awaited<ReturnType<IZernioPostService["getPost"]>>) {}

  async createPost() {
    return { postId: "post-1", status: "publishing", scheduledFor: null, timezone: null, platforms: [] };
  }

  async getPost() {
    return this.post;
  }

  async cancelPost() {}

  async updatePost() {
    return { postId: "post-1", status: "scheduled", scheduledFor: null, timezone: null, platforms: [] };
  }
}

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

describe("reconcilePublicationFromZernio", () => {
  test("updates publication status from Zernio getPost", async () => {
    const publication = createProcessingPublication();
    const repository = new InMemoryPublicationRepository(publication);
    const zernioPostService = new StubZernioPostService({
      postId: "zernio-post-1",
      status: "published",
      scheduledFor: null,
      timezone: null,
      platforms: [
        {
          accountId: "zernio-acc-1",
          platformPostId: "ig-post-1",
          publishedUrl: "https://instagram.com/p/abc",
          status: "published",
          errorMessage: null,
          errorCode: null,
        },
      ],
    });

    const resolved = await reconcilePublicationFromZernio(
      publication,
      repository,
      zernioPostService,
      new NoopLogger(),
    );

    expect(resolved.status).toBe(PublicationStatusEnum.COMPLETED);
    expect(resolved.targets[0]?.status).toBe(PublicationTargetStatusEnum.SUCCESS);
    expect(resolved.targets[0]?.platformPostUrl).toBe("https://instagram.com/p/abc");
  });

  test("skips reconciliation when publication is already terminal", async () => {
    const publication = createProcessingPublication();
    publication.applyAggregateStatus(PublicationStatusEnum.COMPLETED);
    publication.finalizeStatus();

    const zernioPostService = new StubZernioPostService(null);
    const getPostSpy = zernioPostService.getPost.bind(zernioPostService);
    let getPostCalls = 0;
    zernioPostService.getPost = async () => {
      getPostCalls += 1;
      return getPostSpy();
    };

    const resolved = await reconcilePublicationFromZernio(
      publication,
      new InMemoryPublicationRepository(publication),
      zernioPostService,
      new NoopLogger(),
    );

    expect(getPostCalls).toBe(0);
    expect(resolved.status).toBe(PublicationStatusEnum.COMPLETED);
  });
});

import { describe, expect, test } from "bun:test";
import {
  mapZernioPostAggregateStatus,
  syncPublicationFromZernioPost,
} from "@/app/usecases/zernio/sync-publication-from-zernio-post.util";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";

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

  return publication;
}

describe("syncPublicationFromZernioPost", () => {
  test("maps aggregate published status to completed", () => {
    expect(mapZernioPostAggregateStatus("published")).toBe(
      PublicationStatusEnum.COMPLETED,
    );
  });

  test("syncs target and aggregate status", () => {
    const publication = createProcessingPublication();

    const changed = syncPublicationFromZernioPost({
      publication,
      postStatus: "published",
      platformEntries: [
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

    expect(changed).toBe(true);
    expect(publication.status).toBe(PublicationStatusEnum.COMPLETED);
    expect(publication.targets[0]?.status).toBe(PublicationTargetStatusEnum.SUCCESS);
  });

  test("marks pending targets as success when aggregate is published without platform entries", () => {
    const publication = createProcessingPublication();

    syncPublicationFromZernioPost({
      publication,
      postStatus: "published",
      platformEntries: [],
    });

    expect(publication.status).toBe(PublicationStatusEnum.COMPLETED);
    expect(publication.targets[0]?.status).toBe(PublicationTargetStatusEnum.SUCCESS);
  });
});

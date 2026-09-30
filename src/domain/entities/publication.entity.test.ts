import { describe, expect, test } from "bun:test";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import { PUBLICATION_VERIFICATION_TIMEOUT_MS } from "@/domain/constants/publication-verification.constant";

function createProcessingPublication(updatedAt: Date): Publication {
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

  const data = publication.toObject();
  data.updatedAt = updatedAt;
  data.targets = data.targets.map((target) => ({
    ...target,
    status: PublicationTargetStatusEnum.PROCESSING,
    updatedAt,
  }));

  return Publication.restore(data);
}

describe("Publication verification timeout", () => {
  test("marks stale processing publication as unverified", () => {
    const staleUpdatedAt = new Date(Date.now() - PUBLICATION_VERIFICATION_TIMEOUT_MS - 1_000);
    const publication = createProcessingPublication(staleUpdatedAt);
    const now = new Date();

    const changed = publication.applyVerificationTimeoutIfStale(
      PUBLICATION_VERIFICATION_TIMEOUT_MS,
      now,
    );

    expect(changed).toBe(true);
    expect(publication.status).toBe(PublicationStatusEnum.UNVERIFIED);
    expect(publication.targets[0]?.status).toBe(PublicationTargetStatusEnum.UNVERIFIED);
  });

  test("keeps recent processing publication unchanged", () => {
    const publication = createProcessingPublication(new Date());

    const changed = publication.applyVerificationTimeoutIfStale(
      PUBLICATION_VERIFICATION_TIMEOUT_MS,
    );

    expect(changed).toBe(false);
    expect(publication.status).toBe(PublicationStatusEnum.PROCESSING);
  });
});

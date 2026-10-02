import { describe, expect, it } from "bun:test";
import { Publication } from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import { InstagramContentTypeEnum } from "@/domain/types/publication-platform-settings.types";
import {
  buildDefaultZernioTiktokSettings,
  buildInstagramPlatformSpecificData,
  buildZernioPostPayload,
  buildZernioPlatformSpecificData,
  publicationIncludesTiktokTarget,
} from "@/infra/zernio/zernio-post-payload.builder";

function createPublication(input: {
  type: PublicationTypeEnum;
  targets: Array<{
    platform: SocialPlatformEnum;
    zernioAccountId: string;
  }>;
}) {
  const publication = Publication.create({
    userId: "user-1",
    type: input.type,
    destinationScope: PublicationDestinationScopeEnum.SELECTED,
    caption: "Hello world",
    mediaUrl: "https://media.example.com/file.jpg",
    objectKey: "https://media.example.com/file.jpg",
    objectKeys: ["https://media.example.com/file.jpg"],
    targets: input.targets.map((target, index) => ({
      socialConnectedAccountId: `social-${index + 1}`,
      platform: target.platform,
      zernioAccountId: target.zernioAccountId,
    })),
  });

  publication.setId("pub-1");
  return publication;
}

describe("buildZernioPlatformSpecificData", () => {
  it("maps instagram story content type", () => {
    expect(
      buildZernioPlatformSpecificData({
        publicationType: PublicationTypeEnum.STORY,
        platform: SocialPlatformEnum.INSTAGRAM,
      }),
    ).toEqual({ contentType: "story" });
  });

  it("maps instagram post shareToFeed", () => {
    expect(
      buildZernioPlatformSpecificData({
        publicationType: PublicationTypeEnum.POST,
        platform: SocialPlatformEnum.INSTAGRAM,
      }),
    ).toEqual({ shareToFeed: true });
  });

  it("maps instagram settings from platform settings", () => {
    expect(
      buildInstagramPlatformSpecificData({
        contentType: InstagramContentTypeEnum.STORY,
        isAiGenerated: true,
        collaborators: ["brandpartner"],
        firstComment: "Link in bio",
        customCaption: "",
      }),
    ).toEqual({
      contentType: "story",
      isAiGenerated: true,
      collaborators: ["brandpartner"],
      firstComment: "Link in bio",
    });
  });
});

describe("buildZernioPostPayload", () => {
  it("builds carousel media items", () => {
    const publication = createPublication({
      type: PublicationTypeEnum.POST,
      targets: [
        {
          platform: SocialPlatformEnum.INSTAGRAM,
          zernioAccountId: "zernio-ig-1",
        },
      ],
    });

    const payload = buildZernioPostPayload(publication, [
      "https://media.example.com/1.jpg",
      "https://media.example.com/2.jpg",
      "https://media.example.com/3.jpg",
    ]);

    expect(payload.mediaItems).toHaveLength(3);
    expect(payload.mediaItems.map((item) => item.url)).toEqual([
      "https://media.example.com/1.jpg",
      "https://media.example.com/2.jpg",
      "https://media.example.com/3.jpg",
    ]);
  });

  it("builds multi-platform targets in a single post", () => {
    const publication = createPublication({
      type: PublicationTypeEnum.POST,
      targets: [
        {
          platform: SocialPlatformEnum.INSTAGRAM,
          zernioAccountId: "zernio-ig-1",
        },
        {
          platform: SocialPlatformEnum.LINKEDIN,
          zernioAccountId: "zernio-li-1",
        },
      ],
    });

    const payload = buildZernioPostPayload(publication, [
      "https://media.example.com/file.jpg",
    ]);

    expect(payload.platforms).toHaveLength(2);
    expect(payload.platforms).toEqual([
      {
        platform: SocialPlatformEnum.INSTAGRAM,
        accountId: "zernio-ig-1",
        customContent: undefined,
        platformSpecificData: { shareToFeed: true },
      },
      {
        platform: SocialPlatformEnum.LINKEDIN,
        accountId: "zernio-li-1",
        customContent: undefined,
        platformSpecificData: undefined,
      },
    ]);
  });

  it("includes tiktokSettings when a target is tiktok", () => {
    const publication = createPublication({
      type: PublicationTypeEnum.POST,
      targets: [
        {
          platform: SocialPlatformEnum.TIKTOK,
          zernioAccountId: "zernio-tt-1",
        },
      ],
    });

    expect(publicationIncludesTiktokTarget(publication)).toBe(true);

    const payload = buildZernioPostPayload(publication, [
      "https://media.example.com/video.mp4",
    ]);

    expect(payload.tiktokSettings).toEqual(buildDefaultZernioTiktokSettings());
    expect(payload.mediaItems[0]?.type).toBe("video");
  });

  it("includes instagram custom caption and platform settings", () => {
    const publication = createPublication({
      type: PublicationTypeEnum.POST,
      targets: [
        {
          platform: SocialPlatformEnum.INSTAGRAM,
          zernioAccountId: "zernio-ig-1",
        },
      ],
    });

    const payload = buildZernioPostPayload(
      publication,
      ["https://media.example.com/file.jpg"],
      {
        platformSettings: {
          instagram: {
            contentType: InstagramContentTypeEnum.FEED,
            isAiGenerated: false,
            collaborators: [],
            firstComment: "CTA",
            customCaption: "Custom IG caption",
          },
        },
      },
    );

    expect(payload.platforms[0]).toEqual({
      platform: SocialPlatformEnum.INSTAGRAM,
      accountId: "zernio-ig-1",
      customContent: "Custom IG caption",
      platformSpecificData: {
        firstComment: "CTA",
      },
    });
  });

  it("omits tiktokSettings when no tiktok target is present", () => {
    const publication = createPublication({
      type: PublicationTypeEnum.POST,
      targets: [
        {
          platform: SocialPlatformEnum.INSTAGRAM,
          zernioAccountId: "zernio-ig-1",
        },
      ],
    });

    const payload = buildZernioPostPayload(publication, [
      "https://media.example.com/file.jpg",
    ]);

    expect(payload.tiktokSettings).toBeUndefined();
  });
});

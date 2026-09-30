import type { PublicationTypeEnum } from "@/domain/enums/publication.enum";
import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import type { Publication } from "@/domain/entities/publication.entity";

export function buildZernioPlatformSpecificData(input: {
  publicationType: PublicationTypeEnum;
  platform: SocialPlatformEnum;
}): Record<string, unknown> | undefined {
  if (
    input.platform === "instagram" &&
    input.publicationType === "story"
  ) {
    return { contentType: "story" };
  }

  if (
    input.platform === "instagram" &&
    input.publicationType === "post"
  ) {
    return { shareToFeed: true };
  }

  return undefined;
}

export function resolveMediaItemType(contentType: string): "image" | "video" {
  return contentType.startsWith("video/") ? "video" : "image";
}

export function buildZernioPostPayload(
  publication: Publication,
  mediaUrls: string[],
  options?: {
    publishNow?: boolean;
    scheduledFor?: string;
    timezone?: string;
  },
) {
  const publishNow = options?.publishNow ?? true;

  return {
    content: publication.caption,
    mediaItems: mediaUrls.map((url) => ({
      type: resolveMediaItemTypeFromUrl(url),
      url,
    })),
    publishNow: publishNow ? true : undefined,
    scheduledFor: options?.scheduledFor,
    timezone: options?.timezone,
    metadata: {
      publicationId: publication.id,
    },
    platforms: publication.targets.map((target) => ({
      platform: target.platform,
      accountId: target.zernioAccountId,
      platformSpecificData: buildZernioPlatformSpecificData({
        publicationType: publication.type,
        platform: target.platform,
      }),
    })),
    idempotencyKey: publication.idempotencyKey,
  };
}

function resolveMediaItemTypeFromUrl(url: string): "image" | "video" {
  const normalized = url.toLowerCase();

  if (
    normalized.includes(".mp4") ||
    normalized.includes(".mov") ||
    normalized.includes(".webm")
  ) {
    return "video";
  }

  return "image";
}

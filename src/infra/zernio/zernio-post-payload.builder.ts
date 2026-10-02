import type { PublicationTypeEnum } from "@/domain/enums/publication.enum";
import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import type { Publication } from "@/domain/entities/publication.entity";
import {
  InstagramContentTypeEnum,
  type IInstagramPlatformSettings,
  type IPlatformSettings,
} from "@/domain/types/publication-platform-settings.types";

export function buildDefaultZernioTiktokSettings(): Record<string, unknown> {
  return {
    privacy_level: "PUBLIC_TO_EVERYONE",
    allow_comment: true,
    allow_duet: true,
    allow_stitch: true,
    content_preview_confirmed: true,
    express_consent_given: true,
  };
}

export function publicationIncludesTiktokTarget(publication: Publication): boolean {
  return publication.targets.some((target) => target.platform === "tiktok");
}

export function buildInstagramPlatformSpecificData(
  settings?: IInstagramPlatformSettings,
): Record<string, unknown> | undefined {
  if (!settings) {
    return undefined;
  }

  const data: Record<string, unknown> = {};

  if (settings.contentType === InstagramContentTypeEnum.STORY) {
    data.contentType = "story";
  }

  if (settings.contentType === InstagramContentTypeEnum.REEL) {
    data.shareToFeed = true;
  }

  if (settings.isAiGenerated) {
    data.isAiGenerated = true;
  }

  if (settings.collaborators.length > 0) {
    data.collaborators = settings.collaborators;
  }

  if (settings.firstComment.trim()) {
    data.firstComment = settings.firstComment.trim();
  }

  return Object.keys(data).length > 0 ? data : undefined;
}

export function buildZernioPlatformSpecificData(input: {
  publicationType: PublicationTypeEnum;
  platform: SocialPlatformEnum;
  instagramSettings?: IInstagramPlatformSettings;
}): Record<string, unknown> | undefined {
  if (input.platform === "instagram" && input.instagramSettings) {
    const instagramData = buildInstagramPlatformSpecificData(input.instagramSettings);

    if (instagramData) {
      return instagramData;
    }
  }

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
    queuedFromProfile?: string;
    queueId?: string;
    platformSettings?: IPlatformSettings;
  },
) {
  const publishNow = options?.publishNow ?? true;
  const isQueued = Boolean(options?.queuedFromProfile);
  const instagramSettings = options?.platformSettings?.instagram;

  return {
    content: publication.caption,
    mediaItems: mediaUrls.map((url) => ({
      type: resolveMediaItemTypeFromUrl(url),
      url,
    })),
    publishNow: !isQueued && publishNow ? true : undefined,
    scheduledFor: isQueued ? undefined : options?.scheduledFor,
    timezone: isQueued ? undefined : options?.timezone,
    queuedFromProfile: options?.queuedFromProfile,
    queueId: options?.queueId,
    metadata: {
      publicationId: publication.id,
    },
    platforms: publication.targets.map((target) => ({
      platform: target.platform,
      accountId: target.zernioAccountId,
      customContent:
        target.platform === "instagram" &&
        instagramSettings?.customCaption.trim()
          ? instagramSettings.customCaption.trim()
          : undefined,
      platformSpecificData: buildZernioPlatformSpecificData({
        publicationType: publication.type,
        platform: target.platform,
        instagramSettings:
          target.platform === "instagram" ? instagramSettings : undefined,
      }),
    })),
    tiktokSettings: publicationIncludesTiktokTarget(publication)
      ? buildDefaultZernioTiktokSettings()
      : undefined,
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

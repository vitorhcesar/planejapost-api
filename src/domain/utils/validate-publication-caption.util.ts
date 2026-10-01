import { AppError } from "@/domain/errors/app.error";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";

export const X_POST_CAPTION_MAX_LENGTH = 280;

export function assertCaptionWithinPlatformLimits(input: {
  caption: string | null | undefined;
  platforms: SocialPlatformEnum[];
}): void {
  const caption = input.caption?.trim();

  if (!caption) {
    return;
  }

  if (
    input.platforms.includes(SocialPlatformEnum.TWITTER) &&
    caption.length > X_POST_CAPTION_MAX_LENGTH
  ) {
    throw new AppError(
      `A legenda excede o limite de ${X_POST_CAPTION_MAX_LENGTH} caracteres para publicação no X`,
      400,
      "caption_too_long_for_platform",
      { platform: SocialPlatformEnum.TWITTER, maxLength: X_POST_CAPTION_MAX_LENGTH },
    );
  }
}

export enum SocialPlatformEnum {
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
  LINKEDIN = "linkedin",
  TIKTOK = "tiktok",
  THREADS = "threads",
  TWITTER = "twitter",
}

export const HEADLESS_SOCIAL_PLATFORMS = new Set<SocialPlatformEnum>([
  SocialPlatformEnum.FACEBOOK,
  SocialPlatformEnum.LINKEDIN,
]);

export function isSocialPlatform(value: string): value is SocialPlatformEnum {
  return Object.values(SocialPlatformEnum).includes(value as SocialPlatformEnum);
}

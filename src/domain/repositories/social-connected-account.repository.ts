import type { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import type { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";

export interface ISocialConnectedAccountRepository {
  findById(id: string): Promise<SocialConnectedAccount | null>;
  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<SocialConnectedAccount | null>;
  findByUserId(userId: string): Promise<SocialConnectedAccount[]>;
  findByUserIdAndZernioAccountId(
    userId: string,
    zernioAccountId: string,
  ): Promise<SocialConnectedAccount | null>;
  findByZernioAccountId(
    zernioAccountId: string,
  ): Promise<SocialConnectedAccount | null>;
  findConnectedByUserId(userId: string): Promise<SocialConnectedAccount[]>;
  save(account: SocialConnectedAccount): Promise<SocialConnectedAccount>;
  countAll(): Promise<number>;
  countByStatus(status: SocialAccountStatusEnum): Promise<number>;
}

export function isSupportedSocialPlatform(
  platform: string,
): platform is SocialPlatformEnum {
  return [
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "threads",
    "twitter",
  ].includes(platform);
}

import type { SocialConnectSession as PrismaSocialConnectSession } from "../../../../../generated/prisma";
import { SocialConnectSession } from "@/domain/entities/social-connect-session.entity";
import { ConnectModeEnum } from "@/domain/enums/connect-mode.enum";
import {
  SocialPlatformEnum,
  isSocialPlatform,
} from "@/domain/enums/social-platform.enum";

export class SocialConnectSessionMapper {
  static toDomain(row: PrismaSocialConnectSession): SocialConnectSession {
    return SocialConnectSession.restore({
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      reconnectSocialAccountId: row.reconnectSocialAccountId,
      socialConnectedAccountId: row.socialConnectedAccountId,
      platform: SocialConnectSessionMapper.toPlatform(row.platform),
      zernioProfileId: row.zernioProfileId,
      mode: SocialConnectSessionMapper.toMode(row.mode),
      state: row.state,
      tempToken: row.tempToken,
      connectToken: row.connectToken,
      step: row.step,
      expiresAt: row.expiresAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
    });
  }

  static toPrismaCreate(session: SocialConnectSession) {
    const data = session.toObject();

    return {
      userId: data.userId,
      workspaceId: data.workspaceId,
      reconnectSocialAccountId: data.reconnectSocialAccountId,
      socialConnectedAccountId: data.socialConnectedAccountId,
      platform: data.platform,
      zernioProfileId: data.zernioProfileId,
      mode: data.mode,
      state: data.state,
      tempToken: data.tempToken,
      connectToken: data.connectToken,
      step: data.step,
      expiresAt: data.expiresAt,
      completedAt: data.completedAt,
    };
  }

  static toPrismaUpdate(session: SocialConnectSession) {
    const data = session.toObject();

    return {
      tempToken: data.tempToken,
      connectToken: data.connectToken,
      step: data.step,
      completedAt: data.completedAt,
      socialConnectedAccountId: data.socialConnectedAccountId,
    };
  }

  private static toPlatform(platform: string): SocialPlatformEnum {
    return isSocialPlatform(platform)
      ? platform
      : SocialPlatformEnum.INSTAGRAM;
  }

  private static toMode(mode: string): ConnectModeEnum {
    return mode === ConnectModeEnum.HEADLESS
      ? ConnectModeEnum.HEADLESS
      : ConnectModeEnum.STANDARD;
  }
}

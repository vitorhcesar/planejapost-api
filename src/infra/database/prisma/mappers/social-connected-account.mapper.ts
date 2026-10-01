import type {
  Prisma,
  SocialConnectedAccount as PrismaSocialConnectedAccount,
} from "../../../../../generated/prisma";
import { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import {
  SocialPlatformEnum,
  isSocialPlatform,
} from "@/domain/enums/social-platform.enum";

export class SocialConnectedAccountMapper {
  static toDomain(row: PrismaSocialConnectedAccount): SocialConnectedAccount {
    return SocialConnectedAccount.restore({
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      accountSlotId: null,
      platform: SocialConnectedAccountMapper.toPlatform(row.platform),
      zernioAccountId: row.zernioAccountId,
      zernioProfileId: row.zernioProfileId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      status: SocialConnectedAccountMapper.toStatus(row.status),
      canPost: row.canPost,
      needsReconnect: row.needsReconnect,
      permissions:
        row.permissions && typeof row.permissions === "object"
          ? (row.permissions as Record<string, unknown>)
          : null,
      connectedAt: row.connectedAt,
      disconnectedAt: row.disconnectedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPrismaCreate(account: SocialConnectedAccount) {
    const data = account.toObject();

    return {
      userId: data.userId,
      workspaceId: data.workspaceId,
      platform: data.platform,
      zernioAccountId: data.zernioAccountId,
      zernioProfileId: data.zernioProfileId,
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      status: data.status,
      canPost: data.canPost,
      needsReconnect: data.needsReconnect,
      permissions: (data.permissions ?? undefined) as Prisma.InputJsonValue | undefined,
      connectedAt: data.connectedAt,
      disconnectedAt: data.disconnectedAt,
    };
  }

  static toPrismaUpdate(account: SocialConnectedAccount) {
    const data = account.toObject();

    return {
      workspaceId: data.workspaceId,
      platform: data.platform,
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      status: data.status,
      canPost: data.canPost,
      needsReconnect: data.needsReconnect,
      permissions: (data.permissions ?? undefined) as Prisma.InputJsonValue | undefined,
      connectedAt: data.connectedAt,
      disconnectedAt: data.disconnectedAt,
      updatedAt: data.updatedAt,
    };
  }

  private static toPlatform(platform: string): SocialPlatformEnum {
    return isSocialPlatform(platform)
      ? platform
      : SocialPlatformEnum.INSTAGRAM;
  }

  private static toStatus(status: string): SocialAccountStatusEnum {
    if (status === SocialAccountStatusEnum.DISCONNECTED) {
      return SocialAccountStatusEnum.DISCONNECTED;
    }

    if (status === SocialAccountStatusEnum.ERROR) {
      return SocialAccountStatusEnum.ERROR;
    }

    return SocialAccountStatusEnum.CONNECTED;
  }
}

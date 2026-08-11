import type { InstagramConnectedAccount as PrismaInstagramConnectedAccount } from "../../../../../generated/prisma";
import { InstagramConnectedAccount } from "@/domain/entities/instagram-connected-account.entity";
import { InstagramConnectedAccountStatusEnum } from "@/domain/enums/instagram.enum";
import { TokenCipher } from "@/infra/crypto/token-cipher";

export class InstagramConnectedAccountMapper {
  private static readonly tokenCipher = TokenCipher.createFromEnv();

  static toDomain(
    row: PrismaInstagramConnectedAccount,
  ): InstagramConnectedAccount {
    return InstagramConnectedAccount.restore({
      id: row.id,
      userId: row.userId,
      instagramUserId: row.instagramUserId,
      username: row.username,
      displayName: row.displayName,
      profilePictureUrl: row.profilePictureUrl,
      accessToken: InstagramConnectedAccountMapper.tokenCipher.decrypt(
        row.accessToken,
      ),
      tokenExpiresAt: row.tokenExpiresAt,
      scopes: row.scopes.split(",").filter(Boolean),
      status: InstagramConnectedAccountMapper.toDomainStatus(row.status),
      integrationSource:
        row.integrationSource === "user_meta_app"
          ? "user_meta_app"
          : "legacy_project_app",
      metaAppConfigId: row.metaAppConfigId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPrismaCreate(account: InstagramConnectedAccount) {
    const data = account.toObject();

    return {
      userId: data.userId,
      instagramUserId: data.instagramUserId,
      username: data.username,
      displayName: data.displayName,
      profilePictureUrl: data.profilePictureUrl,
      accessToken: InstagramConnectedAccountMapper.tokenCipher.encrypt(
        data.accessToken,
      ),
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes.join(","),
      status: data.status,
      integrationSource: data.integrationSource,
      metaAppConfigId: data.metaAppConfigId,
    };
  }

  static toPrismaUpdate(account: InstagramConnectedAccount) {
    const data = account.toObject();

    return {
      username: data.username,
      displayName: data.displayName,
      profilePictureUrl: data.profilePictureUrl,
      accessToken: InstagramConnectedAccountMapper.tokenCipher.encrypt(
        data.accessToken,
      ),
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes.join(","),
      status: data.status,
      integrationSource: data.integrationSource,
      metaAppConfigId: data.metaAppConfigId,
      updatedAt: data.updatedAt,
    };
  }

  private static toDomainStatus(
    status: string,
  ): InstagramConnectedAccountStatusEnum {
    if (status === InstagramConnectedAccountStatusEnum.EXPIRED) {
      return InstagramConnectedAccountStatusEnum.EXPIRED;
    }

    if (status === InstagramConnectedAccountStatusEnum.DISCONNECTED) {
      return InstagramConnectedAccountStatusEnum.DISCONNECTED;
    }

    return InstagramConnectedAccountStatusEnum.CONNECTED;
  }
}

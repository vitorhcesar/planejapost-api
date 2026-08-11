import type { InstagramConnectedAccount } from "@/domain/entities/instagram-connected-account.entity";
import type { IInstagramConnectedAccountDto } from "@/app/usecases/instagram/dto/instagram.dto";

export function mapInstagramConnectedAccountToDto(
  account: InstagramConnectedAccount,
): IInstagramConnectedAccountDto {
  const data = account.toObject();

  return {
    id: data.id,
    instagramUserId: data.instagramUserId,
    username: data.username,
    displayName: data.displayName,
    profilePictureUrl: data.profilePictureUrl,
    scopes: data.scopes,
    status: data.status,
    tokenExpiresAt: data.tokenExpiresAt.toISOString(),
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    integrationSource: data.integrationSource,
  };
}

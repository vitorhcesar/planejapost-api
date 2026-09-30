import type { ISocialConnectedAccountDto } from "@/app/usecases/social/dto/social.dto";
import type { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";

export async function mapSocialConnectedAccountToDto(
  account: SocialConnectedAccount,
  accountSlotRepository: IAccountSlotRepository,
): Promise<ISocialConnectedAccountDto> {
  const slot = await accountSlotRepository.findBySocialConnectedAccountId(
    account.id,
  );

  const isExpired =
    slot !== null &&
    (slot.status === AccountSlotStatusEnum.EXPIRED ||
      slot.expiresAt.getTime() < Date.now());

  return {
    id: account.id,
    platform: account.platform,
    zernioAccountId: account.zernioAccountId,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    status: account.status,
    canPost: account.canPost,
    needsReconnect: account.needsReconnect,
    accountSlotId: slot?.id ?? null,
    isExpired,
    connectedAt: account.connectedAt.toISOString(),
    disconnectedAt: account.disconnectedAt?.toISOString() ?? null,
  };
}

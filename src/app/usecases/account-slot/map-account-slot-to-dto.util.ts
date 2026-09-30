import type { IAccountSlotWithAccount } from "@/domain/repositories/account-slot.repository";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type {
  IAccountSlotAccountDto,
  IAccountSlotDto,
} from "@/app/usecases/account-slot/dto/account-slot.dto";

function mapSocialAccountToDto(
  account: NonNullable<IAccountSlotWithAccount["socialAccount"]>,
): IAccountSlotAccountDto {
  return {
    id: account.id,
    platform: account.platform,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    status: account.status,
    canPost: account.canPost,
    needsReconnect: account.needsReconnect,
  };
}

export function mapAccountSlotToDto(slot: IAccountSlotWithAccount): IAccountSlotDto {
  const isExpired =
    slot.status === AccountSlotStatusEnum.EXPIRED ||
    slot.expiresAt.getTime() < Date.now();

  return {
    id: slot.id,
    status: isExpired ? AccountSlotStatusEnum.EXPIRED : slot.status,
    expiresAt: slot.expiresAt.toISOString(),
    isExpired,
    socialAccount: slot.socialAccount
      ? mapSocialAccountToDto(slot.socialAccount)
      : null,
    createdAt: slot.createdAt.toISOString(),
  };
}

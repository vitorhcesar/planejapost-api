import type { IAccountSlotWithAccount } from "@/domain/repositories/account-slot.repository";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type {
  IAccountSlotAccountDto,
  IAccountSlotDto,
} from "@/app/usecases/account-slot/dto/account-slot.dto";
import { getInstagramAccountConnectionHealth } from "@/domain/instagram/instagram-account-health.util";

function mapInstagramAccountToDto(
  account: NonNullable<IAccountSlotWithAccount["instagramAccount"]>,
): IAccountSlotAccountDto {
  const health = getInstagramAccountConnectionHealth({
    status: account.status,
    tokenExpiresAt: account.tokenExpiresAt,
  });

  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    profilePictureUrl: account.profilePictureUrl,
    status: account.status,
    tokenExpiresAt: account.tokenExpiresAt.toISOString(),
    isTokenExpired: health.isTokenExpired,
    hasConnectionIssue: health.hasConnectionIssue,
    issueType: health.issueType,
    integrationSource: account.integrationSource,
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
    instagramAccount: slot.instagramAccount
      ? mapInstagramAccountToDto(slot.instagramAccount)
      : null,
    createdAt: slot.createdAt.toISOString(),
  };
}

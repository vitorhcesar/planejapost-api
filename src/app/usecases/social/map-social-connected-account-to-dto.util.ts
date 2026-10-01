import type { ISocialConnectedAccountDto } from "@/app/usecases/social/dto/social.dto";
import type { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";

export async function mapSocialConnectedAccountToDto(
  account: SocialConnectedAccount,
  accountSlotRepository: IAccountSlotRepository,
  workspaceRepository: IWorkspaceRepository,
): Promise<ISocialConnectedAccountDto> {
  const [slot, workspace] = await Promise.all([
    accountSlotRepository.findBySocialConnectedAccountId(account.id),
    workspaceRepository.findById(account.workspaceId),
  ]);

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
    workspaceId: account.workspaceId,
    workspaceName: workspace?.name ?? "",
    accountSlotId: slot?.id ?? null,
    isExpired,
    connectedAt: account.connectedAt.toISOString(),
    disconnectedAt: account.disconnectedAt?.toISOString() ?? null,
  };
}

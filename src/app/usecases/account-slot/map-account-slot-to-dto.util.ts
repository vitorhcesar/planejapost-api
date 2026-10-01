import type { IAccountSlotDto } from "@/app/usecases/account-slot/dto/account-slot.dto";
import type { IAccountSlotWithAccount } from "@/domain/repositories/account-slot.repository";

export function mapAccountSlotToDto(slot: IAccountSlotWithAccount): IAccountSlotDto {
  return {
    id: slot.id,
    status: slot.status,
    socialAccount: slot.socialAccount
      ? {
          id: slot.socialAccount.id,
          platform: slot.socialAccount.platform,
          username: slot.socialAccount.username,
          displayName: slot.socialAccount.displayName,
          avatarUrl: slot.socialAccount.avatarUrl,
          status: slot.socialAccount.status,
          canPost: slot.socialAccount.canPost,
          needsReconnect: slot.socialAccount.needsReconnect,
          workspaceId: slot.socialAccount.workspaceId,
          workspaceName: slot.socialAccount.workspaceName,
        }
      : null,
    createdAt: slot.createdAt.toISOString(),
  };
}

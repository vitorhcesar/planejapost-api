import type { ISocialConnectedAccountDto } from "@/app/usecases/social/dto/social.dto";
import type { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";

export async function mapSocialConnectedAccountToDto(
  account: SocialConnectedAccount,
  workspaceRepository: IWorkspaceRepository,
): Promise<ISocialConnectedAccountDto> {
  const workspace = await workspaceRepository.findById(account.workspaceId);

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
    connectedAt: account.connectedAt.toISOString(),
    disconnectedAt: account.disconnectedAt?.toISOString() ?? null,
  };
}

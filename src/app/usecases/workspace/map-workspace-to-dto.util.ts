import type { IWorkspaceDto } from "@/app/usecases/workspace/dto/workspace.dto";
import type { IWorkspaceWithCounts } from "@/domain/repositories/workspace.repository";

export function mapWorkspaceToDto(item: IWorkspaceWithCounts): IWorkspaceDto {
  const workspace = item.workspace;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    color: workspace.color,
    isDefault: workspace.isDefault,
    accountCount: item.accountCount,
    connectedAccountCount: item.connectedAccountCount,
    createdAt: workspace.createdAt.toISOString(),
  };
}

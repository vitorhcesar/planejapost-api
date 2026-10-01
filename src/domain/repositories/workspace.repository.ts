import type { Workspace } from "@/domain/entities/workspace.entity";

export interface IWorkspaceWithCounts {
  workspace: Workspace;
  accountCount: number;
  connectedAccountCount: number;
}

export interface IWorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Workspace | null>;
  findActiveByIdAndUserId(id: string, userId: string): Promise<Workspace | null>;
  findDefaultByUserId(userId: string): Promise<Workspace | null>;
  findAllByUserId(
    userId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Workspace[]>;
  findAllWithCountsByUserId(
    userId: string,
    options?: { includeArchived?: boolean },
  ): Promise<IWorkspaceWithCounts[]>;
  countByUserId(userId: string): Promise<number>;
  countActiveByUserId(userId: string): Promise<number>;
  getSlugsByUserId(userId: string): Promise<string[]>;
  create(workspace: Workspace): Promise<Workspace>;
  save(workspace: Workspace): Promise<Workspace>;
  moveAllAccountsToWorkspace(
    fromWorkspaceId: string,
    toWorkspaceId: string,
  ): Promise<number>;
  countConnectedAccountsByWorkspaceId(workspaceId: string): Promise<number>;
}

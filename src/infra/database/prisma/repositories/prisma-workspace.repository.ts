import type { Workspace } from "@/domain/entities/workspace.entity";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import type {
  IWorkspaceRepository,
  IWorkspaceWithCounts,
} from "@/domain/repositories/workspace.repository";
import { WorkspaceMapper } from "@/infra/database/prisma/mappers/workspace.mapper";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaWorkspaceRepository
  extends BasePrismaRepository
  implements IWorkspaceRepository
{
  async findById(id: string): Promise<Workspace | null> {
    const row = await this.getPrismaClient().workspace.findUnique({
      where: { id },
    });

    return row ? WorkspaceMapper.toDomain(row) : null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Workspace | null> {
    const row = await this.getPrismaClient().workspace.findFirst({
      where: { id, userId },
    });

    return row ? WorkspaceMapper.toDomain(row) : null;
  }

  async findActiveByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Workspace | null> {
    const row = await this.getPrismaClient().workspace.findFirst({
      where: { id, userId, archivedAt: null },
    });

    return row ? WorkspaceMapper.toDomain(row) : null;
  }

  async findDefaultByUserId(userId: string): Promise<Workspace | null> {
    const row = await this.getPrismaClient().workspace.findFirst({
      where: { userId, isDefault: true, archivedAt: null },
    });

    return row ? WorkspaceMapper.toDomain(row) : null;
  }

  async findAllByUserId(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<Workspace[]> {
    const rows = await this.getPrismaClient().workspace.findMany({
      where: {
        userId,
        ...(options.includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return rows.map(WorkspaceMapper.toDomain);
  }

  async findAllWithCountsByUserId(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<IWorkspaceWithCounts[]> {
    const rows = await this.getPrismaClient().workspace.findMany({
      where: {
        userId,
        ...(options.includeArchived ? {} : { archivedAt: null }),
      },
      include: {
        socialConnectedAccounts: {
          select: { id: true, status: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return rows.map((row) => ({
      workspace: WorkspaceMapper.toDomain(row),
      accountCount: row.socialConnectedAccounts.length,
      connectedAccountCount: row.socialConnectedAccounts.filter(
        (account) => account.status === SocialAccountStatusEnum.CONNECTED,
      ).length,
    }));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.getPrismaClient().workspace.count({
      where: { userId, archivedAt: null },
    });
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.countByUserId(userId);
  }

  async getSlugsByUserId(userId: string): Promise<string[]> {
    const rows = await this.getPrismaClient().workspace.findMany({
      where: { userId, archivedAt: null },
      select: { slug: true },
    });

    return rows.map((row) => row.slug);
  }

  async create(workspace: Workspace): Promise<Workspace> {
    const row = await this.getPrismaClient().workspace.create({
      data: WorkspaceMapper.toPrismaCreate(workspace),
    });

    return WorkspaceMapper.toDomain(row);
  }

  async save(workspace: Workspace): Promise<Workspace> {
    const row = await this.getPrismaClient().workspace.update({
      where: { id: workspace.id },
      data: WorkspaceMapper.toPrismaUpdate(workspace),
    });

    return WorkspaceMapper.toDomain(row);
  }

  async moveAllAccountsToWorkspace(
    fromWorkspaceId: string,
    toWorkspaceId: string,
  ): Promise<number> {
    const result = await this.getPrismaClient().socialConnectedAccount.updateMany({
      where: { workspaceId: fromWorkspaceId },
      data: { workspaceId: toWorkspaceId },
    });

    return result.count;
  }

  async countConnectedAccountsByWorkspaceId(workspaceId: string): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count({
      where: {
        workspaceId,
        status: SocialAccountStatusEnum.CONNECTED,
      },
    });
  }
}

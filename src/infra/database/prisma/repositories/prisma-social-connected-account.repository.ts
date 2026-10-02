import type { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import { SocialConnectedAccountMapper } from "@/infra/database/prisma/mappers/social-connected-account.mapper";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaSocialConnectedAccountRepository
  extends BasePrismaRepository
  implements ISocialConnectedAccountRepository
{
  async findById(id: string): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findUnique({
      where: { id },
    });

    return row ? SocialConnectedAccountMapper.toDomain(row) : null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findFirst({
      where: { id, userId },
    });

    return row ? SocialConnectedAccountMapper.toDomain(row) : null;
  }

  async findByUserId(
    userId: string,
    filters: { workspaceId?: string; status?: SocialAccountStatusEnum } = {},
  ): Promise<SocialConnectedAccount[]> {
    const rows = await this.getPrismaClient().socialConnectedAccount.findMany({
      where: {
        userId,
        ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => SocialConnectedAccountMapper.toDomain(row));
  }

  async findConnectedByWorkspaceId(
    workspaceId: string,
  ): Promise<SocialConnectedAccount[]> {
    const rows = await this.getPrismaClient().socialConnectedAccount.findMany({
      where: {
        workspaceId,
        status: "connected",
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => SocialConnectedAccountMapper.toDomain(row));
  }

  async findByUserIdAndZernioAccountId(
    userId: string,
    zernioAccountId: string,
  ): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findFirst({
      where: { userId, zernioAccountId },
    });

    return row ? SocialConnectedAccountMapper.toDomain(row) : null;
  }

  async findByZernioAccountId(
    zernioAccountId: string,
  ): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findFirst({
      where: { zernioAccountId },
    });

    return row ? SocialConnectedAccountMapper.toDomain(row) : null;
  }

  async findConnectedByUserId(userId: string): Promise<SocialConnectedAccount[]> {
    const rows = await this.getPrismaClient().socialConnectedAccount.findMany({
      where: {
        userId,
        status: "connected",
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => SocialConnectedAccountMapper.toDomain(row));
  }

  async save(account: SocialConnectedAccount): Promise<SocialConnectedAccount> {
    if (account.id) {
      const row = await this.getPrismaClient().socialConnectedAccount.update({
        where: { id: account.id },
        data: SocialConnectedAccountMapper.toPrismaUpdate(account),
      });

      return SocialConnectedAccountMapper.toDomain(row);
    }

    const row = await this.getPrismaClient().socialConnectedAccount.create({
      data: SocialConnectedAccountMapper.toPrismaCreate(account),
    });

    return SocialConnectedAccountMapper.toDomain(row);
  }

  async deleteByIdAndUserId(id: string, userId: string): Promise<void> {
    await this.getPrismaClient().socialConnectedAccount.deleteMany({
      where: { id, userId },
    });
  }

  async countAll(): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count();
  }

  async countByStatus(status: SocialAccountStatusEnum): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count({
      where: { status },
    });
  }
}

import type { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import type { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { SocialConnectedAccount as PrismaSocialConnectedAccount } from "../../../../../generated/prisma";
import { SocialConnectedAccountMapper } from "@/infra/database/prisma/mappers/social-connected-account.mapper";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

type TSocialAccountRow = PrismaSocialConnectedAccount & {
  accountSlot?: { id: string } | null;
};

export class PrismaSocialConnectedAccountRepository
  extends BasePrismaRepository
  implements ISocialConnectedAccountRepository
{
  async findById(id: string): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findUnique({
      where: { id },
      include: { accountSlot: true },
    });

    return row ? this.mapRow(row) : null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findFirst({
      where: { id, userId },
      include: { accountSlot: true },
    });

    return row ? this.mapRow(row) : null;
  }

  async findByUserId(
    userId: string,
    filters: { workspaceId?: string } = {},
  ): Promise<SocialConnectedAccount[]> {
    const rows = await this.getPrismaClient().socialConnectedAccount.findMany({
      where: {
        userId,
        ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
      },
      include: { accountSlot: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.mapRow(row));
  }

  async findConnectedByWorkspaceId(
    workspaceId: string,
  ): Promise<SocialConnectedAccount[]> {
    const rows = await this.getPrismaClient().socialConnectedAccount.findMany({
      where: {
        workspaceId,
        status: "connected",
      },
      include: { accountSlot: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.mapRow(row));
  }

  async findByUserIdAndZernioAccountId(
    userId: string,
    zernioAccountId: string,
  ): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findFirst({
      where: { userId, zernioAccountId },
      include: { accountSlot: true },
    });

    return row ? this.mapRow(row) : null;
  }

  async findByZernioAccountId(
    zernioAccountId: string,
  ): Promise<SocialConnectedAccount | null> {
    const row = await this.getPrismaClient().socialConnectedAccount.findFirst({
      where: { zernioAccountId },
      include: { accountSlot: true },
    });

    return row ? this.mapRow(row) : null;
  }

  async findConnectedByUserId(userId: string): Promise<SocialConnectedAccount[]> {
    const rows = await this.getPrismaClient().socialConnectedAccount.findMany({
      where: {
        userId,
        status: "connected",
      },
      include: { accountSlot: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.mapRow(row));
  }

  async save(account: SocialConnectedAccount): Promise<SocialConnectedAccount> {
    if (account.id) {
      const row = await this.getPrismaClient().socialConnectedAccount.update({
        where: { id: account.id },
        data: SocialConnectedAccountMapper.toPrismaUpdate(account),
        include: { accountSlot: true },
      });

      return this.mapRow(row);
    }

    const row = await this.getPrismaClient().socialConnectedAccount.create({
      data: SocialConnectedAccountMapper.toPrismaCreate(account),
      include: { accountSlot: true },
    });

    return this.mapRow(row);
  }

  async countAll(): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count();
  }

  async countByStatus(status: SocialAccountStatusEnum): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count({
      where: { status },
    });
  }

  private mapRow(row: TSocialAccountRow): SocialConnectedAccount {
    const account = SocialConnectedAccountMapper.toDomain(row);

    if (row.accountSlot?.id) {
      account.assignSlot(row.accountSlot.id);
    }

    return account;
  }
}

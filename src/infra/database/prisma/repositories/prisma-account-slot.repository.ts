import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type {
  IAccountSlot,
  IAccountSlotRepository,
  IAccountSlotWithAccount,
} from "@/domain/repositories/account-slot.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

function mapSlot(row: {
  id: string;
  userId: string;
  socialConnectedAccountId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): IAccountSlot {
  return {
    id: row.id,
    userId: row.userId,
    socialConnectedAccountId: row.socialConnectedAccountId,
    status: row.status as AccountSlotStatusEnum,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAccountSlotRepository
  extends BasePrismaRepository
  implements IAccountSlotRepository
{
  async findByIdAndUserId(id: string, userId: string): Promise<IAccountSlot | null> {
    const row = await this.getPrismaClient().accountSlot.findFirst({
      where: { id, userId },
    });

    return row ? mapSlot(row) : null;
  }

  async findByUserId(userId: string): Promise<IAccountSlotWithAccount[]> {
    const rows = await this.getPrismaClient().accountSlot.findMany({
      where: { userId },
      include: {
        socialConnectedAccount: {
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
            canPost: true,
            needsReconnect: true,
            workspaceId: true,
            workspace: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      ...mapSlot(row),
      socialAccount: row.socialConnectedAccount
        ? {
            id: row.socialConnectedAccount.id,
            platform: row.socialConnectedAccount.platform,
            username: row.socialConnectedAccount.username,
            displayName: row.socialConnectedAccount.displayName,
            avatarUrl: row.socialConnectedAccount.avatarUrl,
            status: row.socialConnectedAccount.status,
            canPost: row.socialConnectedAccount.canPost,
            needsReconnect: row.socialConnectedAccount.needsReconnect,
            workspaceId: row.socialConnectedAccount.workspaceId,
            workspaceName: row.socialConnectedAccount.workspace.name,
          }
        : null,
    }));
  }

  async findBySocialConnectedAccountId(
    accountId: string,
  ): Promise<IAccountSlot | null> {
    const row = await this.getPrismaClient().accountSlot.findFirst({
      where: { socialConnectedAccountId: accountId },
    });

    return row ? mapSlot(row) : null;
  }

  async createMany(
    userId: string,
    slots: Array<Record<string, never>>,
  ): Promise<IAccountSlot[]> {
    const created = await this.getPrismaClient().$transaction(async (tx) => {
      const rows = [];

      for (const _slot of slots) {
        const row = await tx.accountSlot.create({
          data: {
            userId,
            status: AccountSlotStatusEnum.ACTIVE,
          },
        });
        rows.push(row);
      }

      return rows;
    });

    return created.map(mapSlot);
  }

  async assignAccount(slotId: string, accountId: string): Promise<IAccountSlot> {
    const row = await this.getPrismaClient().accountSlot.update({
      where: { id: slotId },
      data: { socialConnectedAccountId: accountId },
    });

    return mapSlot(row);
  }

  async releaseAccount(accountId: string): Promise<void> {
    await this.getPrismaClient().accountSlot.updateMany({
      where: { socialConnectedAccountId: accountId },
      data: { socialConnectedAccountId: null },
    });
  }

  async deactivate(slotId: string): Promise<void> {
    await this.getPrismaClient().accountSlot.update({
      where: { id: slotId },
      data: {
        status: AccountSlotStatusEnum.EXPIRED,
        socialConnectedAccountId: null,
      },
    });
  }

  async findAvailableSlot(userId: string): Promise<IAccountSlot | null> {
    const row = await this.getPrismaClient().accountSlot.findFirst({
      where: {
        userId,
        status: AccountSlotStatusEnum.ACTIVE,
        socialConnectedAccountId: null,
      },
      orderBy: { createdAt: "asc" },
    });

    return row ? mapSlot(row) : null;
  }
}

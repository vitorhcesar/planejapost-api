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
  instagramConnectedAccountId: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): IAccountSlot {
  return {
    id: row.id,
    userId: row.userId,
    instagramConnectedAccountId: row.instagramConnectedAccountId,
    status: row.status as AccountSlotStatusEnum,
    expiresAt: row.expiresAt,
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
        instagramConnectedAccount: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePictureUrl: true,
            status: true,
            tokenExpiresAt: true,
            integrationSource: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      ...mapSlot(row),
      instagramAccount: row.instagramConnectedAccount
        ? {
            id: row.instagramConnectedAccount.id,
            username: row.instagramConnectedAccount.username,
            displayName: row.instagramConnectedAccount.displayName,
            profilePictureUrl: row.instagramConnectedAccount.profilePictureUrl,
            status: row.instagramConnectedAccount.status,
            tokenExpiresAt: row.instagramConnectedAccount.tokenExpiresAt,
            integrationSource:
              row.instagramConnectedAccount.integrationSource === "user_meta_app"
                ? "user_meta_app"
                : "legacy_project_app",
          }
        : null,
    }));
  }

  async findByInstagramConnectedAccountId(
    accountId: string,
  ): Promise<IAccountSlot | null> {
    const row = await this.getPrismaClient().accountSlot.findFirst({
      where: { instagramConnectedAccountId: accountId },
    });

    return row ? mapSlot(row) : null;
  }

  async createMany(
    userId: string,
    slots: Array<{ expiresAt: Date }>,
  ): Promise<IAccountSlot[]> {
    const created = await this.getPrismaClient().$transaction(async (tx) => {
      const rows = [];

      for (const slot of slots) {
        const row = await tx.accountSlot.create({
          data: {
            userId,
            expiresAt: slot.expiresAt,
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
      data: { instagramConnectedAccountId: accountId },
    });

    return mapSlot(row);
  }

  async releaseAccount(accountId: string): Promise<void> {
    await this.getPrismaClient().accountSlot.updateMany({
      where: { instagramConnectedAccountId: accountId },
      data: { instagramConnectedAccountId: null },
    });
  }

  async renew(slotId: string, expiresAt: Date): Promise<IAccountSlot> {
    const row = await this.getPrismaClient().accountSlot.update({
      where: { id: slotId },
      data: {
        expiresAt,
        status: AccountSlotStatusEnum.ACTIVE,
      },
    });

    return mapSlot(row);
  }

  async expireOverdueSlots(userId: string): Promise<void> {
    await this.getPrismaClient().accountSlot.updateMany({
      where: {
        userId,
        status: AccountSlotStatusEnum.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: { status: AccountSlotStatusEnum.EXPIRED },
    });
  }
}

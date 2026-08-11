import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import { InstagramConnectedAccountMapper } from "@/infra/database/prisma/mappers/instagram-connected-account.mapper";
import type { InstagramConnectedAccount } from "@/domain/entities/instagram-connected-account.entity";
import type { IInstagramConnectedAccountRepository } from "@/domain/repositories/instagram-connected-account.repository";
import { InstagramConnectedAccountStatusEnum } from "@/domain/enums/instagram.enum";

export class PrismaInstagramConnectedAccountRepository
  extends BasePrismaRepository
  implements IInstagramConnectedAccountRepository
{
  async findById(id: string): Promise<InstagramConnectedAccount | null> {
    const row = await this.getPrismaClient().instagramConnectedAccount.findUnique(
      {
        where: { id },
      },
    );

    return row ? InstagramConnectedAccountMapper.toDomain(row) : null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<InstagramConnectedAccount | null> {
    const row = await this.getPrismaClient().instagramConnectedAccount.findFirst(
      {
        where: { id, userId },
      },
    );

    return row ? InstagramConnectedAccountMapper.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<InstagramConnectedAccount[]> {
    const rows = await this.getPrismaClient().instagramConnectedAccount.findMany(
      {
        where: {
          userId,
          status: {
            not: InstagramConnectedAccountStatusEnum.DISCONNECTED,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    );

    return rows.map((row) => InstagramConnectedAccountMapper.toDomain(row));
  }

  async findByUserIdAndInstagramUserId(
    userId: string,
    instagramUserId: string,
  ): Promise<InstagramConnectedAccount | null> {
    const row = await this.getPrismaClient().instagramConnectedAccount.findFirst(
      {
        where: { userId, instagramUserId },
      },
    );

    return row ? InstagramConnectedAccountMapper.toDomain(row) : null;
  }

  async findAllByInstagramUserId(
    instagramUserId: string,
  ): Promise<InstagramConnectedAccount[]> {
    const rows = await this.getPrismaClient().instagramConnectedAccount.findMany(
      {
        where: { instagramUserId },
      },
    );

    return rows.map((row) => InstagramConnectedAccountMapper.toDomain(row));
  }

  async findAllByInstagramUserIdAndMetaAppConfigId(
    instagramUserId: string,
    metaAppConfigId: string,
  ): Promise<InstagramConnectedAccount[]> {
    const rows = await this.getPrismaClient().instagramConnectedAccount.findMany({
      where: { instagramUserId, metaAppConfigId },
    });

    return rows.map((row) => InstagramConnectedAccountMapper.toDomain(row));
  }

  async save(
    account: InstagramConnectedAccount,
  ): Promise<InstagramConnectedAccount> {
    if (account.id) {
      const row = await this.getPrismaClient().instagramConnectedAccount.update({
        where: { id: account.id },
        data: InstagramConnectedAccountMapper.toPrismaUpdate(account),
      });

      return InstagramConnectedAccountMapper.toDomain(row);
    }

    const row = await this.getPrismaClient().instagramConnectedAccount.create({
      data: InstagramConnectedAccountMapper.toPrismaCreate(account),
    });

    return InstagramConnectedAccountMapper.toDomain(row);
  }

  async countAll(): Promise<number> {
    return this.getPrismaClient().instagramConnectedAccount.count();
  }
}

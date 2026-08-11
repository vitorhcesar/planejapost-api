import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import type { IInstagramOAuthStateRepository } from "@/domain/repositories/instagram-connected-account.repository";

export class PrismaInstagramOAuthStateRepository
  extends BasePrismaRepository
  implements IInstagramOAuthStateRepository
{
  async create(
    userId: string,
    state: string,
    expiresAt: Date,
    metaAppConfigId: string,
    accountSlotId?: string,
  ): Promise<void> {
    await this.getPrismaClient().instagramOAuthState.create({
      data: {
        userId,
        state,
        expiresAt,
        metaAppConfigId,
        accountSlotId: accountSlotId ?? null,
      },
    });
  }

  async findValidState(
    state: string,
  ): Promise<{
    userId: string;
    accountSlotId: string | null;
    metaAppConfigId: string;
  } | null> {
    const rows = await this.getPrismaClient().$queryRaw<
      Array<{
        userId: string;
        accountSlotId: string | null;
        metaAppConfigId: string;
      }>
    >`
      DELETE FROM "instagram_oauth_state"
      WHERE "state" = ${state}
        AND "expiresAt" > NOW()
      RETURNING
        "userId",
        "accountSlotId",
        "metaAppConfigId"
    `;
    const row = rows[0] ?? null;

    return row
      ? {
          userId: row.userId,
          accountSlotId: row.accountSlotId,
          metaAppConfigId: row.metaAppConfigId,
        }
      : null;
  }

  async deleteByState(state: string): Promise<void> {
    await this.getPrismaClient().instagramOAuthState.deleteMany({
      where: { state },
    });
  }
}

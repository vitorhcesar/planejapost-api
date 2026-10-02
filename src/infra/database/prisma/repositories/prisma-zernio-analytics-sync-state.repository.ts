import type {
  IZernioAnalyticsSyncStateRecord,
  IZernioAnalyticsSyncStateRepository,
} from "@/domain/repositories/zernio-analytics-sync-state.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

const DEFAULT_STATE_ID = "default";

export class PrismaZernioAnalyticsSyncStateRepository
  extends BasePrismaRepository
  implements IZernioAnalyticsSyncStateRepository
{
  async getState(): Promise<IZernioAnalyticsSyncStateRecord> {
    const row = await this.getPrismaClient().zernioAnalyticsSyncState.upsert({
      where: { id: DEFAULT_STATE_ID },
      create: { id: DEFAULT_STATE_ID },
      update: {},
    });

    return {
      nextCursor: row.nextCursor,
      updatedAt: row.updatedAt,
    };
  }

  async saveNextCursor(nextCursor: string): Promise<void> {
    await this.getPrismaClient().zernioAnalyticsSyncState.upsert({
      where: { id: DEFAULT_STATE_ID },
      create: {
        id: DEFAULT_STATE_ID,
        nextCursor,
      },
      update: {
        nextCursor,
      },
    });
  }
}

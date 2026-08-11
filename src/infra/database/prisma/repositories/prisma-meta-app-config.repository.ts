import type { MetaAppConfig } from "@/domain/entities/meta-app-config.entity";
import type { IMetaAppConfigRepository } from "@/domain/repositories/meta-app-config.repository";
import { MetaAppConfigMapper } from "@/infra/database/prisma/mappers/meta-app-config.mapper";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaMetaAppConfigRepository
  extends BasePrismaRepository
  implements IMetaAppConfigRepository
{
  async findActiveByUserId(userId: string): Promise<MetaAppConfig | null> {
    const row = await this.getPrismaClient().metaAppConfig.findFirst({
      where: { userId, isActive: true },
    });

    return row ? MetaAppConfigMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<MetaAppConfig | null> {
    const row = await this.getPrismaClient().metaAppConfig.findUnique({
      where: { id },
    });

    return row ? MetaAppConfigMapper.toDomain(row) : null;
  }

  async findByPublicId(publicId: string): Promise<MetaAppConfig | null> {
    const row = await this.getPrismaClient().metaAppConfig.findUnique({
      where: { publicId },
    });

    return row ? MetaAppConfigMapper.toDomain(row) : null;
  }

  async findByAppId(appId: string): Promise<MetaAppConfig | null> {
    const row = await this.getPrismaClient().metaAppConfig.findUnique({
      where: { appId },
    });

    return row ? MetaAppConfigMapper.toDomain(row) : null;
  }

  async save(config: MetaAppConfig): Promise<MetaAppConfig> {
    const client = this.getPrismaClient();
    const row = config.id
      ? await client.metaAppConfig.update({
          where: { id: config.id },
          data: MetaAppConfigMapper.toPrismaUpdate(config),
        })
      : await client.metaAppConfig.create({
          data: MetaAppConfigMapper.toPrismaCreate(config),
        });

    return MetaAppConfigMapper.toDomain(row);
  }

  async replaceActive(
    userId: string,
    config: MetaAppConfig,
  ): Promise<MetaAppConfig> {
    const row = await this.getPrismaClient().$transaction(async (transaction) => {
      await transaction.metaAppConfig.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return transaction.metaAppConfig.create({
        data: MetaAppConfigMapper.toPrismaCreate(config),
      });
    });

    return MetaAppConfigMapper.toDomain(row);
  }

  async countConnectedAccounts(configId: string): Promise<number> {
    return this.getPrismaClient().instagramConnectedAccount.count({
      where: {
        metaAppConfigId: configId,
        status: { not: "disconnected" },
      },
    });
  }

  async hasBlockingDependencies(configId: string): Promise<boolean> {
    const now = new Date();
    const [accounts, states, publicationTargets] = await Promise.all([
      this.countConnectedAccounts(configId),
      this.getPrismaClient().instagramOAuthState.count({
        where: { metaAppConfigId: configId, expiresAt: { gt: now } },
      }),
      this.getPrismaClient().publicationTarget.count({
        where: {
          instagramConnectedAccount: { metaAppConfigId: configId },
          status: { in: ["pending", "processing"] },
        },
      }),
    ]);

    return accounts > 0 || states > 0 || publicationTargets > 0;
  }

  async delete(id: string): Promise<void> {
    await this.getPrismaClient().metaAppConfig.delete({ where: { id } });
  }
}

import type { SocialConnectSession } from "@/domain/entities/social-connect-session.entity";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import { SocialConnectSessionMapper } from "@/infra/database/prisma/mappers/social-connect-session.mapper";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaSocialConnectSessionRepository
  extends BasePrismaRepository
  implements ISocialConnectSessionRepository
{
  async create(session: SocialConnectSession): Promise<SocialConnectSession> {
    const row = await this.getPrismaClient().socialConnectSession.create({
      data: SocialConnectSessionMapper.toPrismaCreate(session),
    });

    return SocialConnectSessionMapper.toDomain(row);
  }

  async findById(id: string): Promise<SocialConnectSession | null> {
    const row = await this.getPrismaClient().socialConnectSession.findUnique({
      where: { id },
    });

    return row ? SocialConnectSessionMapper.toDomain(row) : null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<SocialConnectSession | null> {
    const row = await this.getPrismaClient().socialConnectSession.findFirst({
      where: { id, userId },
    });

    return row ? SocialConnectSessionMapper.toDomain(row) : null;
  }

  async findByState(state: string): Promise<SocialConnectSession | null> {
    const row = await this.getPrismaClient().socialConnectSession.findUnique({
      where: { state },
    });

    return row ? SocialConnectSessionMapper.toDomain(row) : null;
  }

  async save(session: SocialConnectSession): Promise<SocialConnectSession> {
    const row = await this.getPrismaClient().socialConnectSession.update({
      where: { id: session.id },
      data: SocialConnectSessionMapper.toPrismaUpdate(session),
    });

    return SocialConnectSessionMapper.toDomain(row);
  }

  async deleteById(id: string): Promise<void> {
    await this.getPrismaClient().socialConnectSession.delete({
      where: { id },
    });
  }
}

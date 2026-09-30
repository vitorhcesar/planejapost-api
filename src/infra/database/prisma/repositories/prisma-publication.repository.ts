import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import { PublicationMapper } from "@/infra/database/prisma/mappers/publication.mapper";
import type { Publication } from "@/domain/entities/publication.entity";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";

export class PrismaPublicationRepository
  extends BasePrismaRepository
  implements IPublicationRepository
{
  async findById(id: string): Promise<Publication | null> {
    const row = await this.getPrismaClient().publication.findUnique({
      where: { id },
      include: { targets: true },
    });

    return row ? PublicationMapper.toDomain(row) : null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Publication | null> {
    const row = await this.getPrismaClient().publication.findFirst({
      where: { id, userId },
      include: { targets: true },
    });

    return row ? PublicationMapper.toDomain(row) : null;
  }

  async findByZernioPostId(zernioPostId: string): Promise<Publication | null> {
    const row = await this.getPrismaClient().publication.findUnique({
      where: { zernioPostId },
      include: { targets: true },
    });

    return row ? PublicationMapper.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<Publication[]> {
    const rows = await this.getPrismaClient().publication.findMany({
      where: { userId },
      include: { targets: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(PublicationMapper.toDomain);
  }

  async save(publication: Publication): Promise<Publication> {
    if (publication.id) {
      const data = publication.toObject();

      await this.getPrismaClient().publication.update({
        where: { id: publication.id },
        data: PublicationMapper.publicationToPrismaUpdate(publication),
      });

      for (const target of publication.targets) {
        const targetData = target.toObject();

        if (targetData.id) {
          await this.getPrismaClient().publicationTarget.update({
            where: { id: targetData.id },
            data: PublicationMapper.targetToPrismaUpdate(target),
          });
        }
      }

      const refreshed = await this.findById(publication.id);

      if (!refreshed) {
        throw new Error("Publicação não encontrada após salvar");
      }

      return refreshed;
    }

    const row = await this.getPrismaClient().publication.create({
      data: PublicationMapper.toPrismaCreate(publication),
      include: { targets: true },
    });

    return PublicationMapper.toDomain(row);
  }

  async countByType(type: string): Promise<number> {
    return this.getPrismaClient().publication.count({
      where: { type },
    });
  }
}

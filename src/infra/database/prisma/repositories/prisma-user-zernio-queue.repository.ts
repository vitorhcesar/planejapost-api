import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import { UserZernioQueueMapper } from "@/infra/database/prisma/mappers/user-zernio-queue.mapper";
import type { UserZernioQueue } from "@/domain/entities/user-zernio-queue.entity";
import type { IUserZernioQueueRepository } from "@/domain/repositories/user-zernio-queue.repository";

export class PrismaUserZernioQueueRepository
  extends BasePrismaRepository
  implements IUserZernioQueueRepository
{
  async findByUserId(userId: string): Promise<UserZernioQueue | null> {
    const row = await this.getPrismaClient().userZernioQueue.findUnique({
      where: { userId },
    });

    return row ? UserZernioQueueMapper.toDomain(row) : null;
  }

  async save(queue: UserZernioQueue): Promise<UserZernioQueue> {
    const data = UserZernioQueueMapper.toPrismaUpsert(queue);

    if (queue.id) {
      const row = await this.getPrismaClient().userZernioQueue.update({
        where: { id: queue.id },
        data,
      });

      return UserZernioQueueMapper.toDomain(row);
    }

    const row = await this.getPrismaClient().userZernioQueue.create({
      data,
    });

    return UserZernioQueueMapper.toDomain(row);
  }
}

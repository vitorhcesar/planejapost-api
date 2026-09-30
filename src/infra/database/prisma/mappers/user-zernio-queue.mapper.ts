import type { UserZernioQueue as PrismaUserZernioQueue } from "../../../../../generated/prisma";
import { UserZernioQueue } from "@/domain/entities/user-zernio-queue.entity";
import type { IUserZernioQueueSlot } from "@/domain/entities/user-zernio-queue.entity";

export class UserZernioQueueMapper {
  static toDomain(row: PrismaUserZernioQueue): UserZernioQueue {
    return UserZernioQueue.restore({
      id: row.id,
      userId: row.userId,
      zernioProfileId: row.zernioProfileId,
      zernioQueueId: row.zernioQueueId,
      name: row.name,
      timezone: row.timezone,
      slots: UserZernioQueueMapper.toSlots(row.slots),
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPrismaUpsert(queue: UserZernioQueue) {
    const data = queue.toObject();

    return {
      userId: data.userId,
      zernioProfileId: data.zernioProfileId,
      zernioQueueId: data.zernioQueueId,
      name: data.name,
      timezone: data.timezone,
      slots: data.slots as unknown as object,
      active: data.active,
    };
  }

  private static toSlots(value: unknown): IUserZernioQueueSlot[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => {
        const slot = entry as Record<string, unknown>;
        const dayOfWeek = Number(slot.dayOfWeek);
        const time = typeof slot.time === "string" ? slot.time : "";

        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
          return null;
        }

        if (!/^\d{2}:\d{2}$/.test(time)) {
          return null;
        }

        return { dayOfWeek, time };
      })
      .filter((slot): slot is IUserZernioQueueSlot => slot !== null);
  }
}

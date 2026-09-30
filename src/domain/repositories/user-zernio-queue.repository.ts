import type { UserZernioQueue } from "@/domain/entities/user-zernio-queue.entity";

export interface IUserZernioQueueRepository {
  findByUserId(userId: string): Promise<UserZernioQueue | null>;
  save(queue: UserZernioQueue): Promise<UserZernioQueue>;
}

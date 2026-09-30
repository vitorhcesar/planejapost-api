import type {
  IUpsertZernioQueueInput,
  IZernioNextQueueSlot,
  IZernioQueueSchedule,
} from "@/domain/zernio/zernio-queue.types";

export interface IZernioQueueService {
  getQueueSchedule(input: {
    profileId: string;
    queueId?: string;
  }): Promise<IZernioQueueSchedule | null>;
  upsertQueueSchedule(input: IUpsertZernioQueueInput): Promise<IZernioQueueSchedule>;
  getNextQueueSlot(input: {
    profileId: string;
    queueId?: string;
  }): Promise<IZernioNextQueueSlot | null>;
}

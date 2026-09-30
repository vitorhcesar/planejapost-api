export interface IZernioQueueSlot {
  dayOfWeek: number;
  time: string;
}

export interface IZernioQueueSchedule {
  queueId: string;
  profileId: string;
  name: string;
  timezone: string;
  slots: IZernioQueueSlot[];
  active: boolean;
  isDefault: boolean;
  nextSlots: string[];
}

export interface IUpsertZernioQueueInput {
  profileId: string;
  queueId?: string;
  name: string;
  timezone: string;
  slots: IZernioQueueSlot[];
  active?: boolean;
}

export interface IZernioNextQueueSlot {
  scheduledFor: string | null;
}

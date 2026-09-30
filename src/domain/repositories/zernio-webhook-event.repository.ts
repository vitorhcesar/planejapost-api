export interface IZernioWebhookEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt: Date | null;
  createdAt: Date;
}

export interface IZernioWebhookEventRepository {
  findByEventId(eventId: string): Promise<IZernioWebhookEventRecord | null>;
  create(input: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<IZernioWebhookEventRecord>;
  markAsProcessed(id: string): Promise<void>;
}

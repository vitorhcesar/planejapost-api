export interface IStripeWebhookEvent {
  id: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

export interface IStripeWebhookRepository {
  save(input: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<IStripeWebhookEvent>;
  list(filters: {
    eventType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: IStripeWebhookEvent[]; total: number }>;
  findByEventId(eventId: string): Promise<IStripeWebhookEvent | null>;
}

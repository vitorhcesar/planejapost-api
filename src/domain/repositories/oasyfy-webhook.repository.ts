import type { IOasyfyWebhookPayload, IOasyfyWebhookReceipt } from "@/domain/acquirer/oasyfy-webhook";

export interface IOasyfyWebhookRepository {
  save(payload: IOasyfyWebhookPayload): Promise<IOasyfyWebhookReceipt>;
  list(filters: {
    event?: string;
    token?: string;
    receivedFrom?: Date;
    receivedTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: IOasyfyWebhookReceipt[]; total: number }>;
  findById(id: string): Promise<IOasyfyWebhookReceipt | null>;
}

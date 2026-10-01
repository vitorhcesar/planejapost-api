export interface IOasyfyWebhookPayload {
  event: string;
  token: string;
  transaction?: {
    id?: string;
    status?: string;
    metadata?: Record<string, unknown> | string;
  };
  [key: string]: unknown;
}

export interface IOasyfyWebhookReceipt {
  id: string;
  event: string;
  token: string;
  receivedAt: Date;
}

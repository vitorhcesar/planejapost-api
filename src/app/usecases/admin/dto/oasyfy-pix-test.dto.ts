export interface IOasyfyPixTestPaymentDto {
  id: string;
  amount: number;
  status: string;
  pixCode: string | null;
  pixImageUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  oasyfyTransactionId: string | null;
  webhookReceived: boolean;
  createdAt: string;
}

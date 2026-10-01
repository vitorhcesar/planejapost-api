import type { OasyfyPixTestStatusEnum } from "@/domain/enums/oasyfy-pix-test.enum";

export interface IOasyfyPixTestPayment {
  id: string;
  createdByUserId: string;
  amount: number;
  status: OasyfyPixTestStatusEnum;
  oasyfyTransactionId: string | null;
  pixCode: string | null;
  pixImageUrl: string | null;
  pixExpiresAt: Date | null;
  paidAt: Date | null;
  webhookEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOasyfyPixTestPaymentInput {
  createdByUserId: string;
  amount: number;
}

export interface IUpdateOasyfyPixTestAfterPixCreationInput {
  oasyfyTransactionId: string;
  pixCode: string;
  pixImageUrl: string | null;
  pixExpiresAt: Date;
  status: OasyfyPixTestStatusEnum;
}

export interface IOasyfyPixTestRepository {
  create(input: ICreateOasyfyPixTestPaymentInput): Promise<IOasyfyPixTestPayment>;
  findById(id: string): Promise<IOasyfyPixTestPayment | null>;
  findByOasyfyTransactionId(
    transactionId: string,
  ): Promise<IOasyfyPixTestPayment | null>;
  updateAfterPixCreation(
    id: string,
    input: IUpdateOasyfyPixTestAfterPixCreationInput,
  ): Promise<IOasyfyPixTestPayment>;
  markPaid(id: string, input?: { webhookEventId?: string }): Promise<IOasyfyPixTestPayment>;
  markFailed(id: string): Promise<IOasyfyPixTestPayment>;
}

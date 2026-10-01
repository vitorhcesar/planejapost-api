import type { OmegaPayTransactionStatusEnum } from "@/domain/enums/omegapay.enum";

export interface IOasyfyClient {
  name: string;
  email: string;
  phone: string;
  document: string;
}

export interface IOasyfyReceivePixInput {
  identifier: string;
  amount: number;
  client: IOasyfyClient;
  metadata?: Record<string, unknown> | string;
  callbackUrl?: string;
}

export interface IOasyfyReceivePixResult {
  transactionId: string;
  status: OmegaPayTransactionStatusEnum;
  fee: number;
  order: {
    id: string;
    url?: string;
    receiptUrl?: string;
  };
  pix: {
    code: string;
    image?: string;
    base64?: string;
  };
}

export interface IOasyfyService {
  receivePix(input: IOasyfyReceivePixInput): Promise<IOasyfyReceivePixResult>;
}

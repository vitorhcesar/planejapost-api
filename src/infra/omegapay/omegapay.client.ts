import { AppError } from "@/domain/errors/app.error";
import { EnvService } from "@/infra/config/env.service";
import type {
  IOmegaPayReceivePixInput,
  IOmegaPayReceivePixResult,
  IOmegaPayService,
} from "@/domain/acquirer/omegapay.service";
import { OmegaPayTransactionStatusEnum } from "@/domain/enums/omegapay.enum";

const OMEGAPAY_API_BASE_URL = "https://app.omegapayments.com.br/api/v1";

interface IOmegaPayErrorResponse {
  statusCode?: number;
  errorCode?: string;
  message?: string;
  details?: {
    field?: string;
    value?: unknown;
    issue?: string;
  };
}

export class OmegaPayClient implements IOmegaPayService {
  private readonly env = EnvService.getInstance();

  async receivePix(
    input: IOmegaPayReceivePixInput,
  ): Promise<IOmegaPayReceivePixResult> {
    return this.request<IOmegaPayReceivePixResult>(
      "POST",
      "/gateway/pix/receive",
      input,
    );
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${OMEGAPAY_API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-public-key": this.env.omegapayPublicKey,
        "x-secret-key": this.env.omegapaySecretKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as T & IOmegaPayErrorResponse;

    if (!response.ok) {
      throw new AppError(
        data.message ?? "Falha na requisição à OmegaPay",
        response.status,
        data.errorCode ?? "omegapay_request_failed",
        data.details ? { details: data.details } : undefined,
      );
    }

    return data;
  }
}

export function isOmegaPayTransactionStatus(
  value: string,
): value is OmegaPayTransactionStatusEnum {
  return Object.values(OmegaPayTransactionStatusEnum).includes(
    value as OmegaPayTransactionStatusEnum,
  );
}

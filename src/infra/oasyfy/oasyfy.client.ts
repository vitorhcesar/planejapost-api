import { AppError } from "@/domain/errors/app.error";
import type {
  IOasyfyReceivePixInput,
  IOasyfyReceivePixResult,
  IOasyfyService,
} from "@/domain/acquirer/oasyfy.service";
import { OmegaPayTransactionStatusEnum } from "@/domain/enums/omegapay.enum";
import { EnvService } from "@/infra/config/env.service";

const OASYFY_API_BASE_URL = "https://app.omegapayments.com.br/api/v1";

interface IOasyfyErrorResponse {
  statusCode?: number;
  errorCode?: string;
  message?: string;
}

export class OasyfyClient implements IOasyfyService {
  private readonly env = EnvService.getInstance();

  async receivePix(input: IOasyfyReceivePixInput): Promise<IOasyfyReceivePixResult> {
    return this.request<IOasyfyReceivePixResult>("POST", "/gateway/pix/receive", input);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${OASYFY_API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-public-key": this.env.oasyfyPublicKey,
        "x-secret-key": this.env.oasyfySecretKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as T & IOasyfyErrorResponse;

    if (!response.ok) {
      throw new AppError(
        data.message ?? "Falha na requisição à Oasyfy",
        response.status,
        "oasyfy_request_failed",
      );
    }

    return data;
  }
}

export function isOasyfyTransactionPaid(status: string): boolean {
  return status === OmegaPayTransactionStatusEnum.OK;
}

import { AppError } from "@/domain/errors/app.error";
import type {
  IOasyfyReceivePixInput,
  IOasyfyReceivePixResult,
  IOasyfyService,
} from "@/domain/acquirer/oasyfy.service";
import { OmegaPayTransactionStatusEnum } from "@/domain/enums/omegapay.enum";
import { EnvService } from "@/infra/config/env.service";
import { maskSecret } from "@/shared/utils/mask-secret.util";

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
    const response = await fetch(`${this.env.oasyfyApiBaseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-public-key": this.env.oasyfyPublicKey,
        "x-secret-key": this.env.oasyfySecretKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: (T & IOasyfyErrorResponse) | null = null;

    try {
      data = (await response.json()) as T & IOasyfyErrorResponse;
    } catch {
      throw new AppError(
        `Falha na requisição à Oasyfy (HTTP ${response.status})`,
        response.status,
        "oasyfy_request_failed",
      );
    }

    if (!response.ok) {
      const errorCode = data.errorCode;
      let message = data.message ?? "Falha na requisição à Oasyfy";

      if (errorCode === "GATEWAY_INVALID_CREDENTIALS") {
        message =
          "Credenciais Oasyfy rejeitadas pela API. Confira as chaves de API no painel (app.oasyfy.com), reinicie o backend após alterar o .env e verifique se a conta está habilitada para integração.";
      }

      if (
        errorCode === "GATEWAY_INVALID_ARGUMENT" &&
        message.toLowerCase().includes("documento")
      ) {
        message = "CPF inválido para a Oasyfy. Informe um CPF válido com dígitos verificadores corretos.";
      }

      throw new AppError(message, response.status, errorCode ?? "oasyfy_request_failed", {
        oasyfyErrorCode: errorCode,
        apiBaseUrl: this.env.oasyfyApiBaseUrl,
        publicKeyPreview: maskSecret(this.env.oasyfyPublicKey),
      });
    }

    return data;
  }
}

export function isOasyfyTransactionPaid(status: string): boolean {
  return status === OmegaPayTransactionStatusEnum.OK;
}

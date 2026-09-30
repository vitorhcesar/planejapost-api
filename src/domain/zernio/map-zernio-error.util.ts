import { AppError } from "@/domain/errors/app.error";
import type { IZernioApiErrorShape } from "@/domain/zernio/zernio.types";

const ZERNIO_ERROR_MESSAGES: Record<string, string> = {
  profile_name_conflict: "Perfil Zernio já existe para este usuário",
  idempotency_conflict: "Operação duplicada em andamento. Tente novamente em instantes",
  insufficient_permissions: "Configuração da API Zernio insuficiente",
  PAYMENT_REQUIRED: "Limite da conta Zernio atingido. Entre em contato com o suporte",
  rate_limit_exceeded: "Limite de requisições Zernio atingido. Tente novamente em instantes",
  zernio_rate_limited: "Limite de requisições Zernio atingido. Tente novamente em instantes",
  platform_post_not_allowed: "Esta conta não pode publicar no momento",
};

export function mapZernioErrorToAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const shape = extractZernioErrorShape(error);
  const stableCode = shape.code ?? inferCodeFromStatus(shape.statusCode);
  const message =
    ZERNIO_ERROR_MESSAGES[stableCode] ??
    shape.message ??
    "Falha na integração com Zernio";

  return new AppError(message, shape.statusCode, stableCode, shape.details);
}

function extractZernioErrorShape(error: unknown): IZernioApiErrorShape {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    const zernioError = error as {
      statusCode: number;
      message?: string;
      code?: string;
      type?: string;
      details?: Record<string, unknown>;
    };

    return {
      statusCode: zernioError.statusCode,
      message: zernioError.message ?? "Falha na integração com Zernio",
      code: zernioError.code,
      type: zernioError.type,
      details:
        zernioError.details ??
        (error instanceof AppError ? error.data : undefined),
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 502,
      message: error.message,
      code: "zernio_request_failed",
    };
  }

  return {
    statusCode: 502,
    message: "Falha na integração com Zernio",
    code: "zernio_request_failed",
  };
}

function inferCodeFromStatus(statusCode: number): string {
  if (statusCode === 429) return "zernio_rate_limited";
  if (statusCode === 402) return "PAYMENT_REQUIRED";
  if (statusCode === 403) return "insufficient_permissions";
  if (statusCode === 409) return "idempotency_conflict";
  return "zernio_request_failed";
}

function readExistingIdFromError(
  error: unknown,
  key: "existingProfileId" | "existingPostId",
): string | null {
  if (error instanceof AppError) {
    const value = error.data?.[key];
    if (typeof value === "string") {
      return value;
    }
  }

  const shape = extractZernioErrorShape(error);
  const value = shape.details?.[key];

  return typeof value === "string" ? value : null;
}

export function getExistingProfileIdFromError(error: unknown): string | null {
  return readExistingIdFromError(error, "existingProfileId");
}

export function getExistingPostIdFromError(error: unknown): string | null {
  return readExistingIdFromError(error, "existingPostId");
}

export function getRetryAfterSeconds(error: unknown): number {
  const shape = extractZernioErrorShape(error);
  const retryAfterSeconds = shape.details?.retryAfterSeconds;

  if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
    return retryAfterSeconds;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "getSecondsUntilReset" in error &&
    typeof (error as { getSecondsUntilReset: () => number | undefined })
      .getSecondsUntilReset === "function"
  ) {
    const seconds = (
      error as { getSecondsUntilReset: () => number | undefined }
    ).getSecondsUntilReset();

    if (typeof seconds === "number" && seconds > 0) {
      return seconds;
    }
  }

  return 1;
}

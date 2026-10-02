import { Elysia } from "elysia";
import { ZodError } from "zod";
import { AppError } from "@/domain/errors/app.error";
import { mapPrismaErrorToAppError } from "@/domain/errors/map-prisma-error.util";
import type { ILogger } from "@/domain/services/logger.service";
import { serializeApiError } from "@/http/utils/serialize-api-error";

interface IApiErrorBody {
  status: number;
  message: string;
  code?: string;
  error?: Record<string, unknown>;
  trackingId: string;
}

function buildErrorBody(
  status: number,
  message: string,
  trackingId: string,
  code?: string,
  error?: Record<string, unknown>,
): IApiErrorBody {
  return {
    status,
    message,
    code,
    error,
    trackingId,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TElysiaApp = Elysia<any, any, any, any, any, any, any>;

export function registerGlobalApiErrorHandler(app: TElysiaApp, logger: ILogger): TElysiaApp {
  return app.onError(({ code, error, set, request }) => {
    const trackingId = crypto.randomUUID();
    const path = new URL(request.url).pathname;

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error("API", error.message, error, {
          trackingId,
          code: error.code,
          status: error.statusCode,
          method: request.method,
          path,
        });
      }

      set.status = error.statusCode;

      return buildErrorBody(
        error.statusCode,
        error.message,
        trackingId,
        error.code,
        error.data,
      );
    }

    const prismaError = mapPrismaErrorToAppError(error);
    if (prismaError) {
      logger.error("API", prismaError.message, error, {
        trackingId,
        code: prismaError.code,
        status: prismaError.statusCode,
        method: request.method,
        path,
      });

      set.status = prismaError.statusCode;

      return buildErrorBody(
        prismaError.statusCode,
        prismaError.message,
        trackingId,
        prismaError.code,
        prismaError.data,
      );
    }

    if (error instanceof ZodError) {
      set.status = 422;

      return buildErrorBody(422, "Dados inválidos", trackingId, "validation", {
        issues: error.flatten(),
      });
    }

    if (code === "VALIDATION") {
      set.status = 422;

      return buildErrorBody(422, "Dados inválidos", trackingId, "validation", {
        details: error.message,
      });
    }

    logger.error("API", "Erro interno não tratado", error, {
      trackingId,
      elysiaCode: code,
      err: serializeApiError(error),
      method: request.method,
      path,
    });

    set.status = 500;

    return buildErrorBody(500, "Erro interno do servidor", trackingId, "internal_server_error");
  });
}

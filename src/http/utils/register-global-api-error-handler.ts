import type { Elysia } from "elysia";
import { AppError } from "@/domain/errors/app.error";
import type { ILogger } from "@/domain/services/logger.service";

export function registerGlobalApiErrorHandler(app: Elysia, logger: ILogger): void {
  app.onError(({ error, set, request }) => {
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

      return {
        status: error.statusCode,
        message: error.message,
        code: error.code,
        error: error.data,
        trackingId,
      };
    }

    logger.error("API", "Erro interno não tratado", error, {
      trackingId,
      method: request.method,
      path,
    });

    set.status = 500;

    return {
      status: 500,
      message: "Erro interno do servidor",
      code: "internal_server_error",
      trackingId,
    };
  });
}

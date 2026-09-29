import type { Elysia } from "elysia";
import { AppError } from "@/domain/errors/app.error";

export function registerGlobalApiErrorHandler(app: Elysia): void {
  app.onError(({ error, set, request }) => {
    const trackingId = crypto.randomUUID();

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        console.error(
          JSON.stringify({
            level: "error",
            trackingId,
            type: "AppError",
            code: error.code,
            status: error.statusCode,
            message: error.message,
            data: error.data ?? null,
            request: { method: request.method, url: request.url },
            timestamp: new Date().toISOString(),
          }),
        );
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

    console.error(
      JSON.stringify({
        level: "error",
        trackingId,
        type: "UnhandledError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        request: { method: request.method, url: request.url },
        timestamp: new Date().toISOString(),
      }),
    );

    set.status = 500;

    return {
      status: 500,
      message: "Erro interno do servidor",
      code: "internal_server_error",
      trackingId,
    };
  });
}

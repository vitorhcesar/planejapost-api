import type { Elysia } from "elysia";
import type { ILogger } from "@/domain/services/logger.service";

const SKIP_PATH_PREFIXES = ["/swagger", "/favicon.ico"];

function shouldSkipRequestLog(pathname: string): boolean {
  if (pathname === "/api/v1/health") {
    return true;
  }

  return SKIP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function resolveStatusCode(status: number | string | undefined): number {
  if (typeof status === "number" && Number.isFinite(status)) {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number.parseInt(status, 10);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 200;
}

export function registerHttpRequestLogger(app: Elysia, logger: ILogger): void {
  app
    .derive(({ request }) => ({
      requestStartedAt: Date.now(),
      requestPathname: new URL(request.url).pathname,
    }))
    .onAfterHandle(({ request, set, requestStartedAt, requestPathname }) => {
      if (shouldSkipRequestLog(requestPathname)) {
        return;
      }

      const statusCode = resolveStatusCode(set.status);
      const durationMs = Date.now() - requestStartedAt;

      if (statusCode >= 500) {
        logger.error(
          "HTTP",
          `${request.method} ${requestPathname} → ${statusCode}`,
          new Error("request_failed"),
          { duration: `${durationMs}ms` },
        );
        return;
      }

      if (statusCode >= 400) {
        logger.warn("HTTP", `${request.method} ${requestPathname} → ${statusCode}`, {
          duration: `${durationMs}ms`,
        });
        return;
      }

      logger.info("HTTP", `${request.method} ${requestPathname} → ${statusCode}`, {
        duration: `${durationMs}ms`,
      });
    });
}

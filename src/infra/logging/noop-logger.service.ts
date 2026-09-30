import type { ILogger } from "@/domain/services/logger.service";

export class NoopLogger implements ILogger {
  info(): void {}

  warn(): void {}

  error(): void {}
}

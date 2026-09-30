export interface ILogger {
  info(scope: string, message: string, context?: Record<string, unknown>): void;
  warn(scope: string, message: string, context?: Record<string, unknown>): void;
  error(
    scope: string,
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void;
}

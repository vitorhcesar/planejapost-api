export function serializeApiError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause !== undefined) {
      serialized.cause = cause instanceof Error ? serializeApiError(cause) : String(cause);
    }

    const prismaCode = (error as Error & { code?: string }).code;
    if (prismaCode) {
      serialized.code = prismaCode;
    }

    return serialized;
  }

  if (typeof error === "object" && error !== null) {
    try {
      return { value: JSON.parse(JSON.stringify(error)) };
    } catch {
      return { value: String(error) };
    }
  }

  return { value: String(error) };
}

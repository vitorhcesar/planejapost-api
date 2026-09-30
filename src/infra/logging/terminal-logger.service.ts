import type { ILogger } from "@/domain/services/logger.service";

type TTerminalLogLevel = "info" | "warn" | "error";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
} as const;

const LEVEL_ICON: Record<TTerminalLogLevel, string> = {
  info: `${ANSI.green}●${ANSI.reset}`,
  warn: `${ANSI.yellow}⚠${ANSI.reset}`,
  error: `${ANSI.red}✗${ANSI.reset}`,
};

function formatClockTime(date = new Date()): string {
  return date.toLocaleTimeString("pt-BR", { hour12: false });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return `${ANSI.dim}-${ANSI.reset}`;
  }

  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 157)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (Array.isArray(value)) {
    const serialized = value.map((item) => formatValue(item)).join(", ");
    return serialized.length > 160 ? `${serialized.slice(0, 157)}…` : serialized;
  }

  if (typeof value === "object") {
    const serialized = JSON.stringify(value);
    return serialized.length > 160 ? `${serialized.slice(0, 157)}…` : serialized;
  }

  return String(value);
}

function formatContext(context?: Record<string, unknown>): string {
  if (!context) {
    return "";
  }

  const entries = Object.entries(context).filter(
    ([, value]) => value !== undefined && value !== null,
  );

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(
      ([key, value]) =>
        `  ${ANSI.dim}↳${ANSI.reset} ${ANSI.bold}${key}${ANSI.reset}: ${formatValue(value)}`,
    )
    .join("\n");
}

interface ITerminalLogInput {
  scope: string;
  level: TTerminalLogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function writeTerminalLog(input: ITerminalLogInput): void {
  const time = `${ANSI.gray}${formatClockTime()}${ANSI.reset}`;
  const scope = `${ANSI.cyan}${input.scope}${ANSI.reset}`;
  const icon = LEVEL_ICON[input.level];
  const contextBlock = formatContext(input.context);
  const line = `${time}  ${icon} ${scope}  ${input.message}${contextBlock ? `\n${contextBlock}` : ""}`;

  if (input.level === "error") {
    console.error(line);
    return;
  }

  if (input.level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export class TerminalLogger implements ILogger {
  info(scope: string, message: string, context?: Record<string, unknown>): void {
    writeTerminalLog({ scope, level: "info", message, context });
  }

  warn(scope: string, message: string, context?: Record<string, unknown>): void {
    writeTerminalLog({ scope, level: "warn", message, context });
  }

  error(
    scope: string,
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    writeTerminalLog({
      scope,
      level: "error",
      message,
      context: {
        ...context,
        erro: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack
          ? { stack: error.stack.split("\n").slice(0, 4).join(" | ") }
          : {}),
      },
    });
  }
}

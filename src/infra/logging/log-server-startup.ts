import type { ILogger } from "@/domain/services/logger.service";

export interface IServerStartupLogInput {
  hostname: string;
  port: number;
  publicApiUrl?: string;
}

export function logServerStartup(logger: ILogger, input: IServerStartupLogInput): void {
  const localBaseUrl = `http://${input.hostname}:${input.port}`;

  logger.info("PlanejaPost", "Servidor iniciado", {
    local: localBaseUrl,
    swagger: `${localBaseUrl}/swagger`,
    auth: `${localBaseUrl}/api/auth`,
    ...(input.publicApiUrl ? { publicApi: input.publicApiUrl } : {}),
  });
}

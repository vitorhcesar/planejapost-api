import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type { IOmegaPayService } from "@/domain/acquirer/omegapay.service";
import type { IEmailService } from "@/domain/services/email.service";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioClient } from "@/infra/zernio/zernio.client";
import { EnvService } from "@/infra/config/env.service";
import { EnvPublicApiConfig } from "@/infra/config/public-api.config";
import { OmegaPayClient } from "@/infra/omegapay/omegapay.client";
import { NodemailerMailService } from "@/infra/smtp/nodemailer-mail.service";
import { ZernioClient } from "@/infra/zernio/zernio.client";
import { TerminalLogger } from "@/infra/logging/terminal-logger.service";

export interface IInfrastructure {
  env: EnvService;
  publicApiConfig: IPublicApiConfig;
  publicApiUrl: string;
  frontendOrigin: string;
  zernioClient: IZernioClient;
  omegaPayClient: IOmegaPayService;
  emailService: IEmailService;
  logger: ILogger;
}

export function createInfrastructure(): IInfrastructure {
  const env = EnvService.getInstance();

  return {
    env,
    publicApiConfig: new EnvPublicApiConfig(),
    publicApiUrl: env.publicApiUrl,
    frontendOrigin: env.corsOrigin,
    zernioClient: new ZernioClient(env),
    omegaPayClient: new OmegaPayClient(),
    emailService: new NodemailerMailService(),
    logger: new TerminalLogger(),
  };
}

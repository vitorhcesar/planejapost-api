import type { IOasyfyService } from "@/domain/acquirer/oasyfy.service";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type { IEmailService } from "@/domain/services/email.service";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioClient } from "@/infra/zernio/zernio.client";
import { EnvService } from "@/infra/config/env.service";
import { EnvPublicApiConfig } from "@/infra/config/public-api.config";
import { OasyfyClient } from "@/infra/oasyfy/oasyfy.client";
import { NodemailerMailService } from "@/infra/smtp/nodemailer-mail.service";
import type { IStripeService } from "@/infra/stripe/stripe.client";
import { StripeClient } from "@/infra/stripe/stripe.client";
import { ZernioClient } from "@/infra/zernio/zernio.client";
import { TerminalLogger } from "@/infra/logging/terminal-logger.service";

export interface IInfrastructure {
  env: EnvService;
  publicApiConfig: IPublicApiConfig;
  publicApiUrl: string;
  frontendOrigin: string;
  zernioClient: IZernioClient;
  oasyfyClient: IOasyfyService;
  stripeClient: IStripeService;
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
    oasyfyClient: new OasyfyClient(),
    stripeClient: new StripeClient(),
    emailService: new NodemailerMailService(),
    logger: new TerminalLogger(),
  };
}

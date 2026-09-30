import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type { IOmegaPayService } from "@/domain/acquirer/omegapay.service";
import type { IEmailService } from "@/domain/services/email.service";
import type { ITemporaryPublicationMediaStorage } from "@/domain/storages/temporary-publication-media.storage";
import type { IZernioClient } from "@/infra/zernio/zernio.client";
import { EnvService } from "@/infra/config/env.service";
import { EnvPublicApiConfig } from "@/infra/config/public-api.config";
import { MinioTemporaryPublicationMediaStorage } from "@/infra/object-storage/minio-temporary-publication-media.storage";
import { OmegaPayClient } from "@/infra/omegapay/omegapay.client";
import { NodemailerMailService } from "@/infra/smtp/nodemailer-mail.service";
import { ZernioClient } from "@/infra/zernio/zernio.client";

export interface IInfrastructure {
  env: EnvService;
  publicApiConfig: IPublicApiConfig;
  publicApiUrl: string;
  frontendOrigin: string;
  temporaryMediaStorage: ITemporaryPublicationMediaStorage;
  zernioClient: IZernioClient;
  omegaPayClient: IOmegaPayService;
  emailService: IEmailService;
}

export function createInfrastructure(): IInfrastructure {
  const env = EnvService.getInstance();

  return {
    env,
    publicApiConfig: new EnvPublicApiConfig(),
    publicApiUrl: env.publicApiUrl,
    frontendOrigin: env.corsOrigin,
    temporaryMediaStorage: new MinioTemporaryPublicationMediaStorage(),
    zernioClient: new ZernioClient(env),
    omegaPayClient: new OmegaPayClient(),
    emailService: new NodemailerMailService(),
  };
}

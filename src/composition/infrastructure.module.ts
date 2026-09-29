import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type { IOmegaPayService } from "@/domain/acquirer/omegapay.service";
import type { IEmailService } from "@/domain/services/email.service";
import type { IInstagramContentPublishingService } from "@/domain/instagram/instagram-content-publishing.service";
import type {
  IInstagramGraphService,
  IInstagramOAuthServiceFactory,
} from "@/domain/instagram/instagram.service";
import type { IPublicationQueue } from "@/domain/queue/publication-queue";
import type { ITemporaryPublicationMediaStorage } from "@/domain/storages/temporary-publication-media.storage";
import { EnvService } from "@/infra/config/env.service";
import { EnvPublicApiConfig } from "@/infra/config/public-api.config";
import { InstagramContentPublishingService } from "@/infra/instagram/instagram-content-publishing.service";
import { InstagramGraphClient } from "@/infra/instagram/instagram-graph.client";
import { InstagramOAuthClientFactory } from "@/infra/instagram/instagram-oauth.client";
import { MinioTemporaryPublicationMediaStorage } from "@/infra/object-storage/minio-temporary-publication-media.storage";
import { OmegaPayClient } from "@/infra/omegapay/omegapay.client";
import { PublicationQueue } from "@/infra/queue/publication-queue";
import { NodemailerMailService } from "@/infra/smtp/nodemailer-mail.service";

export interface IMetaAppRuntimeOptions {
  redirectUri: string;
  requestedScopes: string[];
  publicApiUrl: string;
}

export interface IInfrastructure {
  env: EnvService;
  publicApiConfig: IPublicApiConfig;
  publicApiUrl: string;
  frontendOrigin: string;
  metaAppRuntimeOptions: IMetaAppRuntimeOptions;
  publicationQueue: IPublicationQueue;
  temporaryMediaStorage: ITemporaryPublicationMediaStorage;
  instagramGraphClient: IInstagramGraphService;
  instagramOAuthClientFactory: IInstagramOAuthServiceFactory;
  instagramContentPublishingService: IInstagramContentPublishingService;
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
    metaAppRuntimeOptions: {
      redirectUri: env.instagramRedirectUri,
      requestedScopes: env.instagramOAuthScopes.split(",").filter(Boolean),
      publicApiUrl: env.publicApiUrl,
    },
    publicationQueue: new PublicationQueue(),
    temporaryMediaStorage: new MinioTemporaryPublicationMediaStorage(),
    instagramGraphClient: new InstagramGraphClient(),
    instagramOAuthClientFactory: new InstagramOAuthClientFactory(),
    instagramContentPublishingService: new InstagramContentPublishingService(),
    omegaPayClient: new OmegaPayClient(),
    emailService: new NodemailerMailService(),
  };
}

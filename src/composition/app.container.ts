import type { IInfrastructure } from "@/composition/infrastructure.module";
import { createInfrastructure } from "@/composition/infrastructure.module";
import type { IRepositories } from "@/composition/repositories.module";
import { createRepositories } from "@/composition/repositories.module";
import type { IUseCases } from "@/composition/use-cases.module";
import { createUseCases } from "@/composition/use-cases.module";
import {
  PublicationWorker,
  type IPublicationWorkerDependencies,
} from "@/infra/queue/publication-queue";

export interface IAppContainer {
  repositories: IRepositories;
  infrastructure: IInfrastructure;
  useCases: IUseCases;
  publicationWorker: PublicationWorker;
}

export class AppContainer implements IAppContainer {
  readonly repositories: IRepositories;
  readonly infrastructure: IInfrastructure;
  readonly useCases: IUseCases;
  readonly publicationWorker: PublicationWorker;

  private constructor() {
    this.repositories = createRepositories();
    this.infrastructure = createInfrastructure();
    this.useCases = createUseCases(this.repositories, this.infrastructure);
    this.publicationWorker = new PublicationWorker(
      this.buildPublicationWorkerDependencies(),
    );
  }

  private buildPublicationWorkerDependencies(): IPublicationWorkerDependencies {
    return {
      publicationRepository: this.repositories.publication,
      accountRepository: this.repositories.instagramConnectedAccount,
      publishingService: this.infrastructure.instagramContentPublishingService,
      oauthServiceFactory: this.infrastructure.instagramOAuthClientFactory,
      metaAppConfigRepository: this.repositories.metaAppConfig,
      tempStorage: this.infrastructure.temporaryMediaStorage,
      publicApiUrl: this.infrastructure.publicApiUrl,
    };
  }

  static create(): AppContainer {
    return new AppContainer();
  }
}

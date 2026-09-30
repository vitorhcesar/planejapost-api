import type { IInfrastructure } from "@/composition/infrastructure.module";
import { createInfrastructure } from "@/composition/infrastructure.module";
import type { IRepositories } from "@/composition/repositories.module";
import { createRepositories } from "@/composition/repositories.module";
import type { IUseCases } from "@/composition/use-cases.module";
import { createUseCases } from "@/composition/use-cases.module";

export interface IAppContainer {
  repositories: IRepositories;
  infrastructure: IInfrastructure;
  useCases: IUseCases;
}

export class AppContainer implements IAppContainer {
  readonly repositories: IRepositories;
  readonly infrastructure: IInfrastructure;
  readonly useCases: IUseCases;

  private constructor() {
    this.repositories = createRepositories();
    this.infrastructure = createInfrastructure();
    this.useCases = createUseCases(this.repositories, this.infrastructure);
  }

  static create(): AppContainer {
    return new AppContainer();
  }
}

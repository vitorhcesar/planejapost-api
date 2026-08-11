import { randomBytes } from "node:crypto";
import { MetaAppConfig } from "@/domain/entities/meta-app-config.entity";
import type { IMetaAppConfigRepository } from "@/domain/repositories/meta-app-config.repository";
import { AppError } from "@/http/services/app/errors/app.error";

export interface IMetaAppConfigDto {
  id: string;
  label: string;
  appId: string;
  redirectUri: string;
  deauthorizeUrl: string;
  dataDeletionUrl: string;
  isActive: boolean;
  hasSecret: boolean;
  connectedAccountsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMetaAppConfigInput {
  label: string;
  appId: string;
  appSecret: string;
}

interface IMetaAppRuntimeOptions {
  redirectUri: string;
  requestedScopes: string[];
  publicApiUrl: string;
}

function buildComplianceUrl(
  publicApiUrl: string,
  publicId: string,
  action: "deauthorize" | "data-deletion",
): string {
  return new URL(
    `/api/v1/meta-compliance/${encodeURIComponent(publicId)}/${action}`,
    publicApiUrl,
  ).toString();
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function mapToDto(
  config: MetaAppConfig,
  repository: IMetaAppConfigRepository,
  publicApiUrl: string,
): Promise<IMetaAppConfigDto> {
  return {
    id: config.id,
    label: config.label,
    appId: config.appId,
    redirectUri: config.redirectUri,
    deauthorizeUrl: buildComplianceUrl(
      publicApiUrl,
      config.publicId,
      "deauthorize",
    ),
    dataDeletionUrl: buildComplianceUrl(
      publicApiUrl,
      config.publicId,
      "data-deletion",
    ),
    isActive: config.isActive,
    hasSecret: Boolean(config.appSecret),
    connectedAccountsCount: await repository.countConnectedAccounts(config.id),
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export class GetMetaAppConfigUseCase {
  constructor(
    private readonly repository: IMetaAppConfigRepository,
    private readonly publicApiUrl: string,
  ) {}

  async execute(userId: string): Promise<IMetaAppConfigDto | null> {
    const config = await this.repository.findActiveByUserId(userId);

    return config
      ? mapToDto(config, this.repository, this.publicApiUrl)
      : null;
  }
}

export class CreateMetaAppConfigUseCase {
  constructor(
    private readonly repository: IMetaAppConfigRepository,
    private readonly options: IMetaAppRuntimeOptions,
  ) {}

  async execute(
    userId: string,
    input: IMetaAppConfigInput,
  ): Promise<IMetaAppConfigDto> {
    const [activeConfig, appIdConfig] = await Promise.all([
      this.repository.findActiveByUserId(userId),
      this.repository.findByAppId(input.appId),
    ]);

    if (activeConfig) {
      throw new AppError(
        "Você já possui uma configuração Meta ativa",
        409,
        "meta_app_active_already_exists",
      );
    }

    if (appIdConfig) {
      throw new AppError(
        "Este App ID já está em uso",
        409,
        "meta_app_id_in_use",
      );
    }

    const config = this.buildConfig(userId, input);

    try {
      const saved = await this.repository.save(config);
      return mapToDto(saved, this.repository, this.options.publicApiUrl);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "Este App ID já está em uso",
          409,
          "meta_app_id_in_use",
        );
      }

      throw error;
    }
  }

  protected buildConfig(
    userId: string,
    input: IMetaAppConfigInput,
  ): MetaAppConfig {
    return MetaAppConfig.create({
      publicId: `m_${randomBytes(18).toString("base64url")}`,
      userId,
      label: input.label,
      appId: input.appId,
      appSecret: input.appSecret,
      redirectUri: this.options.redirectUri,
      requestedScopes: this.options.requestedScopes,
    });
  }
}

export class ReplaceMetaAppConfigUseCase extends CreateMetaAppConfigUseCase {
  constructor(
    private readonly metaAppRepository: IMetaAppConfigRepository,
    private readonly runtimeOptions: IMetaAppRuntimeOptions,
  ) {
    super(metaAppRepository, runtimeOptions);
  }

  async execute(
    userId: string,
    input: IMetaAppConfigInput,
  ): Promise<IMetaAppConfigDto> {
    const appIdConfig = await this.metaAppRepository.findByAppId(input.appId);

    if (appIdConfig) {
      throw new AppError(
        "Este App ID já está em uso",
        409,
        "meta_app_id_in_use",
      );
    }

    try {
      const saved = await this.metaAppRepository.replaceActive(
        userId,
        this.buildConfig(userId, input),
      );
      return mapToDto(
        saved,
        this.metaAppRepository,
        this.runtimeOptions.publicApiUrl,
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "Este App ID já está em uso",
          409,
          "meta_app_id_in_use",
        );
      }

      throw error;
    }
  }
}

export class RotateMetaAppSecretUseCase {
  constructor(private readonly repository: IMetaAppConfigRepository) {}

  async execute(userId: string, id: string, appSecret: string): Promise<void> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new AppError(
        "Configuração Meta não encontrada",
        404,
        "meta_app_config_not_found",
      );
    }

    if (config.userId !== userId) {
      throw new AppError(
        "Você não pode alterar esta configuração Meta",
        403,
        "meta_app_config_forbidden",
      );
    }

    config.rotateSecret(appSecret);
    await this.repository.save(config);
  }
}

export class DeleteMetaAppConfigUseCase {
  constructor(private readonly repository: IMetaAppConfigRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new AppError(
        "Configuração Meta não encontrada",
        404,
        "meta_app_config_not_found",
      );
    }

    if (config.userId !== userId) {
      throw new AppError(
        "Você não pode remover esta configuração Meta",
        403,
        "meta_app_config_forbidden",
      );
    }

    if (await this.repository.hasBlockingDependencies(id)) {
      throw new AppError(
        "A configuração ainda possui contas, sessões ou publicações vinculadas",
        409,
        "meta_app_config_in_use",
      );
    }

    await this.repository.delete(id);
  }
}

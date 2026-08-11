import type { MetaAppConfig } from "@/domain/entities/meta-app-config.entity";

export interface IMetaAppConfigRepository {
  findActiveByUserId(userId: string): Promise<MetaAppConfig | null>;
  findById(id: string): Promise<MetaAppConfig | null>;
  findByPublicId(publicId: string): Promise<MetaAppConfig | null>;
  findByAppId(appId: string): Promise<MetaAppConfig | null>;
  save(config: MetaAppConfig): Promise<MetaAppConfig>;
  replaceActive(
    userId: string,
    config: MetaAppConfig,
  ): Promise<MetaAppConfig>;
  countConnectedAccounts(configId: string): Promise<number>;
  hasBlockingDependencies(configId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

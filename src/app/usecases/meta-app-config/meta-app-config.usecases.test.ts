import { describe, expect, it } from "bun:test";
import {
  CreateMetaAppConfigUseCase,
  DeleteMetaAppConfigUseCase,
} from "@/app/usecases/meta-app-config/meta-app-config.usecases";
import { MetaAppConfig } from "@/domain/entities/meta-app-config.entity";
import type { IMetaAppConfigRepository } from "@/domain/repositories/meta-app-config.repository";
import { AppError } from "@/http/services/app/errors/app.error";

class InMemoryMetaAppConfigRepository implements IMetaAppConfigRepository {
  configs: MetaAppConfig[] = [];
  blockingDependencies = false;

  async findActiveByUserId(userId: string) {
    return (
      this.configs.find(
        (config) => config.userId === userId && config.isActive,
      ) ?? null
    );
  }

  async findById(id: string) {
    return this.configs.find((config) => config.id === id) ?? null;
  }

  async findByPublicId(publicId: string) {
    return this.configs.find((config) => config.publicId === publicId) ?? null;
  }

  async findByAppId(appId: string) {
    return this.configs.find((config) => config.appId === appId) ?? null;
  }

  async save(config: MetaAppConfig) {
    const saved = config.id
      ? config
      : MetaAppConfig.restore({
          ...config.toObject(),
          id: `config-${this.configs.length + 1}`,
        });
    this.configs = [
      ...this.configs.filter((item) => item.id !== saved.id),
      saved,
    ];
    return saved;
  }

  async replaceActive(userId: string, config: MetaAppConfig) {
    for (const item of this.configs) {
      if (item.userId === userId && item.isActive) {
        item.deactivate();
      }
    }

    return this.save(config);
  }

  async countConnectedAccounts() {
    return 0;
  }

  async hasBlockingDependencies() {
    return this.blockingDependencies;
  }

  async delete(id: string) {
    this.configs = this.configs.filter((config) => config.id !== id);
  }
}

const options = {
  redirectUri: "https://api.example.com/api/v1/instagram/connect/callback",
  requestedScopes: [
    "instagram_business_basic",
    "instagram_business_content_publish",
  ],
  publicApiUrl: "https://api.example.com",
};

describe("Meta app config use cases", () => {
  it("creates an active config without exposing its secret", async () => {
    const repository = new InMemoryMetaAppConfigRepository();
    const useCase = new CreateMetaAppConfigUseCase(repository, options);

    const result = await useCase.execute("user-1", {
      label: "Minha app",
      appId: "123456789",
      appSecret: "super-secret",
    });

    expect(result.appId).toBe("123456789");
    expect(result.hasSecret).toBe(true);
    expect(result).not.toHaveProperty("appSecret");
    expect(result.deauthorizeUrl).toContain("/meta-compliance/m_");
  });

  it("blocks deletion while the config has dependencies", async () => {
    const repository = new InMemoryMetaAppConfigRepository();
    const createUseCase = new CreateMetaAppConfigUseCase(repository, options);
    const config = await createUseCase.execute("user-1", {
      label: "Minha app",
      appId: "123456789",
      appSecret: "super-secret",
    });
    repository.blockingDependencies = true;

    try {
      await new DeleteMetaAppConfigUseCase(repository).execute(
        "user-1",
        config.id,
      );
      throw new Error("Expected deletion to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("meta_app_config_in_use");
    }
  });
});

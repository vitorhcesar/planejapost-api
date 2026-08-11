import type { MetaAppConfig as PrismaMetaAppConfig } from "../../../../../generated/prisma";
import { MetaAppConfig } from "@/domain/entities/meta-app-config.entity";
import { MetaAppSecretCipher } from "@/infra/crypto/meta-app-secret-cipher";

export class MetaAppConfigMapper {
  static toDomain(row: PrismaMetaAppConfig): MetaAppConfig {
    const secretCipher = MetaAppSecretCipher.createFromEnv();

    return MetaAppConfig.restore({
      id: row.id,
      publicId: row.publicId,
      userId: row.userId,
      label: row.label,
      appId: row.appId,
      appSecret: secretCipher.decrypt(row.appSecret),
      redirectUri: row.redirectUri,
      requestedScopes: row.requestedScopes.split(",").filter(Boolean),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPrismaCreate(config: MetaAppConfig) {
    const data = config.toObject();
    const secretCipher = MetaAppSecretCipher.createFromEnv();

    return {
      publicId: data.publicId,
      userId: data.userId,
      label: data.label,
      appId: data.appId,
      appSecret: secretCipher.encrypt(data.appSecret),
      redirectUri: data.redirectUri,
      requestedScopes: data.requestedScopes.join(","),
      isActive: data.isActive,
    };
  }

  static toPrismaUpdate(config: MetaAppConfig) {
    const data = config.toObject();
    const secretCipher = MetaAppSecretCipher.createFromEnv();

    return {
      label: data.label,
      appSecret: secretCipher.encrypt(data.appSecret),
      redirectUri: data.redirectUri,
      requestedScopes: data.requestedScopes.join(","),
      isActive: data.isActive,
      updatedAt: data.updatedAt,
    };
  }
}

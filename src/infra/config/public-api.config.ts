import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import { EnvService } from "@/infra/config/env.service";

export class EnvPublicApiConfig implements IPublicApiConfig {
  private readonly env = EnvService.getInstance();

  get publicApiUrl(): string {
    return this.env.publicApiUrl;
  }
}

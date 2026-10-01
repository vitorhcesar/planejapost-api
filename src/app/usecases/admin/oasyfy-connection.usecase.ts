import type { IOasyfyConnectionDiagnosticsDto } from "@/app/usecases/admin/dto/oasyfy-connection.dto";
import { EnvService } from "@/infra/config/env.service";
import { maskSecret } from "@/shared/utils/mask-secret.util";

export class GetOasyfyConnectionDiagnosticsUseCase {
  private readonly env = EnvService.getInstance();

  execute(): IOasyfyConnectionDiagnosticsDto {
    const publicKey = this.env.oasyfyPublicKeyOptional;
    const secretKey = this.env.oasyfySecretKeyOptional;

    return {
      configured: Boolean(publicKey && secretKey),
      apiBaseUrl: this.env.oasyfyApiBaseUrl,
      publicKeyPreview: publicKey ? maskSecret(publicKey) : null,
      publicKeyLength: publicKey?.length ?? 0,
      secretKeyConfigured: Boolean(secretKey),
      secretKeyLength: secretKey?.length ?? 0,
    };
  }
}

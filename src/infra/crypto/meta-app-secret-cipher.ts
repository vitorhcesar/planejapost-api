import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { EnvService } from "@/http/services/env/env.service";

const ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";
const IV_LENGTH = 12;

export class MetaAppSecretCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = scryptSync(secret, "meta-app-config-secret-v1", 32);
  }

  static createFromEnv(): MetaAppSecretCipher {
    return new MetaAppSecretCipher(
      EnvService.getInstance().metaAppConfigEncryptionKey,
    );
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);

    return [
      CURRENT_VERSION,
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }

  decrypt(payload: string): string {
    const [version, ivBase64, authTagBase64, encryptedBase64] =
      payload.split(".");

    if (
      version !== CURRENT_VERSION ||
      !ivBase64 ||
      !authTagBase64 ||
      !encryptedBase64
    ) {
      throw new Error("Segredo da configuração Meta criptografado inválido");
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivBase64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedBase64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}

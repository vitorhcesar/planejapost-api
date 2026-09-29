import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { EnvService } from "@/infra/config/env.service";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export class TokenCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = scryptSync(secret, "instagram-token-cipher", 32);
  }

  static createFromEnv(): TokenCipher {
    return new TokenCipher(EnvService.getInstance().instagramTokenEncryptionKey);
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }

  decrypt(payload: string): string {
    const [ivBase64, authTagBase64, encryptedBase64] = payload.split(".");

    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
      throw new Error("Token criptografado inválido");
    }

    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      "utf8",
    );
  }
}

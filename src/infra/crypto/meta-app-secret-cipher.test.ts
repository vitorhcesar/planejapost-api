import { describe, expect, it } from "bun:test";
import { MetaAppSecretCipher } from "@/infra/crypto/meta-app-secret-cipher";

describe("MetaAppSecretCipher", () => {
  it("encrypts with a version and decrypts the secret", () => {
    const cipher = new MetaAppSecretCipher("a".repeat(32));
    const encrypted = cipher.encrypt("meta-secret");

    expect(encrypted).toStartWith("v1.");
    expect(encrypted).not.toContain("meta-secret");
    expect(cipher.decrypt(encrypted)).toBe("meta-secret");
  });

  it("rejects ciphertext encrypted with another key", () => {
    const encrypted = new MetaAppSecretCipher("a".repeat(32)).encrypt(
      "meta-secret",
    );

    expect(() =>
      new MetaAppSecretCipher("b".repeat(32)).decrypt(encrypted),
    ).toThrow();
  });
});

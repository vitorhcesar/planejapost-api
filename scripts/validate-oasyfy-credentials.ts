import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const ENV_PATH = resolve(import.meta.dir, "../.env");

function loadEnvFile(): Record<string, string> {
  const content = readFileSync(ENV_PATH, "utf8");
  const entries: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

const fileEnv = loadEnvFile();
const publicKey = (fileEnv.OASYFY_PUBLIC_KEY ?? process.env.OASYFY_PUBLIC_KEY ?? "").trim();
const secretKey = (fileEnv.OASYFY_SECRET_KEY ?? process.env.OASYFY_SECRET_KEY ?? "").trim();
const apiBaseUrl =
  (fileEnv.OASYFY_API_BASE_URL ?? process.env.OASYFY_API_BASE_URL ??
    "https://app.oasyfy.com/api/v1").trim();

if (!publicKey || !secretKey) {
  console.error("OASYFY_PUBLIC_KEY e OASYFY_SECRET_KEY são obrigatórias no backend/.env");
  process.exit(1);
}

console.log("Validando credenciais Oasyfy…");
console.log(`API: ${apiBaseUrl}`);
console.log(`Public key: ${maskSecret(publicKey)} (${publicKey.length} chars)`);
console.log(`Secret key: configurada (${secretKey.length} chars)`);

const response = await fetch(`${apiBaseUrl}/gateway/pix/receive`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-public-key": publicKey,
    "x-secret-key": secretKey,
  },
  body: JSON.stringify({
    identifier: `credential_check_${Date.now()}`,
    amount: 1,
    client: {
      name: "Credential Check",
      email: "credential-check@planejapost.local",
      phone: "11999999999",
      document: "12345678901",
    },
  }),
});

const payload = (await response.json()) as {
  message?: string;
  errorCode?: string;
  transactionId?: string;
};

if (response.ok) {
  console.log("OK: credenciais aceitas pela Oasyfy.");
  console.log(`Transaction ID: ${payload.transactionId ?? "n/a"}`);
  process.exit(0);
}

console.error(`Falha (HTTP ${response.status})`);
console.error(`Código: ${payload.errorCode ?? "n/a"}`);
console.error(`Mensagem: ${payload.message ?? "sem mensagem"}`);

if (payload.errorCode === "GATEWAY_INVALID_CREDENTIALS") {
  console.error("");
  console.error("Checklist:");
  console.error("- Use as chaves de API do painel app.oasyfy.com (Integrações/API)");
  console.error("- Não use token de webhook nem link de checkout");
  console.error("- Confirme se pública e secreta não estão invertidas");
  console.error("- Reinicie o backend após alterar backend/.env");
}

process.exit(1);

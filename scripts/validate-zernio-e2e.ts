#!/usr/bin/env bun
/**
 * Valida pré-requisitos e conectividade Zernio + PlanejaPost para testes E2E.
 *
 * Uso: cd backend && bun run scripts/validate-zernio-e2e.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(import.meta.dir, "../.env");

const WEBHOOK_EVENTS = [
  "account.connected",
  "account.disconnected",
  "post.platform.published",
  "post.platform.failed",
  "post.published",
  "post.partial",
  "post.failed",
] as const;

function loadEnvFile(): Record<string, string> {
  if (!existsSync(ENV_PATH)) {
    return {};
  }

  const values: Record<string, string> = {};

  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function statusLine(ok: boolean, label: string, detail?: string): void {
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function fetchStatus(url: string, init?: RequestInit): Promise<number> {
  try {
    const response = await fetch(url, init);
    return response.status;
  } catch {
    return 0;
  }
}

interface IZernioWebhook {
  _id?: string;
  url?: string;
  isActive?: boolean;
  events?: string[];
}

async function listZernioWebhooks(apiKey: string): Promise<IZernioWebhook[]> {
  const response = await fetch("https://zernio.com/api/v1/webhooks/settings", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { webhooks?: IZernioWebhook[] };
  return data.webhooks ?? [];
}

const fileEnv = loadEnvFile();
const env = { ...fileEnv, ...process.env } as Record<string, string>;

const zernioApiKey = env.ZERNIO_API_KEY;
const zernioWebhookSecret = env.ZERNIO_WEBHOOK_SECRET;
const publicApiUrl = (env.PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const useNgrok = env.USE_NGROK === "true";
const localPort = env.PORT ?? "8080";
const webhookUrl = `${publicApiUrl}/api/v1/webhooks/zernio`;

console.log("\nPlanejaPost — validação Zernio E2E\n");

statusLine(Boolean(zernioApiKey), "ZERNIO_API_KEY configurada");
statusLine(Boolean(zernioWebhookSecret), "ZERNIO_WEBHOOK_SECRET configurado");

if (!zernioWebhookSecret) {
  console.log(
    "  → Gere: openssl rand -hex 32\n  → Adicione ZERNIO_WEBHOOK_SECRET no .env (mesmo valor no webhook da Zernio)",
  );
}

if (useNgrok) {
  console.log(
    "\n  Aviso: USE_NGROK=true abre túnel novo. Se já usa domínio ngrok fixo, use USE_NGROK=false.",
  );
}

console.log(`\n  PUBLIC_API_URL: ${publicApiUrl}`);
console.log(`  Webhook Zernio: ${webhookUrl}\n`);

if (zernioApiKey) {
  const accountsResponse = await fetch("https://zernio.com/api/v1/accounts", {
    headers: { Authorization: `Bearer ${zernioApiKey}` },
  });

  statusLine(
    accountsResponse.ok,
    "Zernio API — list accounts",
    `HTTP ${accountsResponse.status}`,
  );

  if (accountsResponse.ok) {
    const body = (await accountsResponse.json()) as { accounts?: unknown[] };
    console.log(`  Contas conectadas no team Zernio: ${body.accounts?.length ?? 0}`);
  }
}

const localHealth = await fetchStatus(`http://localhost:${localPort}/api/v1/health`);
statusLine(
  localHealth === 200,
  "Backend local",
  `http://localhost:${localPort} → HTTP ${localHealth || "offline"}`,
);

const publicHealth = await fetchStatus(`${publicApiUrl}/api/v1/health`);
statusLine(
  publicHealth === 200,
  "Backend público (webhooks)",
  `${publicApiUrl} → HTTP ${publicHealth || "offline"}`,
);

if (zernioApiKey && zernioWebhookSecret && publicHealth === 200) {
  let webhooks = await listZernioWebhooks(zernioApiKey);
  let hook = webhooks.find((w) => w.url === webhookUrl);

  if (hook?._id) {
    statusLine(true, "Webhook Zernio registrado", webhookUrl);

    const syncResponse = await fetch("https://zernio.com/api/v1/webhooks/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${zernioApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhookId: hook._id,
        secret: zernioWebhookSecret,
        url: webhookUrl,
        events: [...WEBHOOK_EVENTS],
        isActive: true,
      }),
    });

    if (!syncResponse.ok) {
      statusLine(false, "Webhook secret sincronizado", `HTTP ${syncResponse.status}`);
    }
  } else {
    statusLine(false, "Webhook Zernio registrado", "não encontrado — criando...");

    const createResponse = await fetch("https://zernio.com/api/v1/webhooks/settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zernioApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "PlanejaPost Dev",
        url: webhookUrl,
        secret: zernioWebhookSecret,
        events: [...WEBHOOK_EVENTS],
      }),
    });

    if (createResponse.ok) {
      statusLine(true, "Webhook criado na Zernio");
      webhooks = await listZernioWebhooks(zernioApiKey);
      hook = webhooks.find((w) => w.url === webhookUrl);
    } else {
      statusLine(false, "Falha ao criar webhook", `HTTP ${createResponse.status}`);
      console.log(`  ${(await createResponse.text()).slice(0, 400)}`);
    }
  }

  if (hook?._id) {
    const testResponse = await fetch("https://zernio.com/api/v1/webhooks/test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zernioApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ webhookId: hook._id }),
    });

    statusLine(
      testResponse.ok,
      "Webhook test (Zernio → PlanejaPost)",
      `HTTP ${testResponse.status}`,
    );

    if (!testResponse.ok) {
      console.log(`  ${(await testResponse.text()).slice(0, 300)}`);
      console.log(
        "  → Confirme que ZERNIO_WEBHOOK_SECRET no .env = secret usado no webhook Zernio",
      );
    }
  }
}

console.log("\n--- Checklist manual (UI) ---\n");
console.log("1. cd frontend && bun run dev → http://localhost:5173");
console.log("2. Login/cadastro");
console.log("3. /social/accounts — comprar slot e conectar rede (ex. Instagram)");
console.log("4. /publications/new — upload + publicar");
console.log("5. /publications/:id — status completed após webhook\n");

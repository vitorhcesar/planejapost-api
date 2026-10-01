import ngrok from "@ngrok/ngrok";

export interface INgrokTunnelService {
  start(port: number): Promise<string>;
  stop(): Promise<void>;
}

export class NgrokTunnelService implements INgrokTunnelService {
  private listener: ngrok.Listener | null = null;

  async start(port: number): Promise<string> {
    const authtoken = process.env.NGROK_AUTHTOKEN;

    this.listener = await ngrok.forward({
      addr: port,
      ...(authtoken ? { authtoken } : {}),
    });

    const publicUrl = this.listener.url();

    if (!publicUrl) {
      throw new Error("ngrok não retornou uma URL pública");
    }

    return publicUrl.replace(/\/$/, "");
  }

  async stop(): Promise<void> {
    if (!this.listener) {
      return;
    }

    await this.listener.close();
    this.listener = null;
  }
}

export function printNgrokUrls(publicUrl: string, localPort: number): void {
  const lines = [
    "",
    "══════════════════════════════════════════════════════════════",
    "  ngrok ativo (USE_NGROK=true)",
    "══════════════════════════════════════════════════════════════",
    `  Public API:       ${publicUrl}`,
    `  Zernio webhook:   ${publicUrl}/api/v1/webhooks/zernio`,
    `  Oasyfy webhook: ${publicUrl}/api/v1/webhooks/oasyfy`,
    `  Stripe webhook: ${publicUrl}/api/v1/webhooks/stripe`,
    `  Swagger:          ${publicUrl}/swagger`,
    `  Better Auth:      ${publicUrl}/api/auth`,
    `  Servidor local:   http://localhost:${localPort}`,
    "══════════════════════════════════════════════════════════════",
    "",
  ];

  console.log(lines.join("\n"));
}

export function shouldUseNgrok(): boolean {
  return process.env.USE_NGROK === "true";
}

export function resolveLocalPort(): number {
  const rawPort = process.env.PORT ?? "8080";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`PORT inválida: ${rawPort}`);
  }

  return port;
}

import { AppService } from "@/http/services/app/app.service";
import {
  NgrokTunnelService,
  printNgrokUrls,
  resolveLocalPort,
  shouldUseNgrok,
} from "@/infra/dev/ngrok-tunnel.service";

export class HttpServerBootstrap {
  private readonly ngrokTunnel = new NgrokTunnelService();

  async start(): Promise<void> {
    const localPort = resolveLocalPort();

    if (shouldUseNgrok()) {
      const publicUrl = await this.ngrokTunnel.start(localPort);
      process.env.PUBLIC_API_URL = publicUrl;
      printNgrokUrls(publicUrl, localPort);
      this.registerNgrokShutdown();
    }

    const appService = new AppService();
    appService.start();
  }

  private registerNgrokShutdown(): void {
    const shutdown = async () => {
      await this.ngrokTunnel.stop();
    };

    process.once("SIGTERM", () => {
      void shutdown();
    });

    process.once("SIGINT", () => {
      void shutdown();
    });
  }
}

import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { EnvService } from "@/http/services/env/env.service";
import { createHttpServerClient } from "@/http/client";
import { HealthRoutes } from "@/http/routes/api/v1/health.routes";
import { UserRoutes } from "@/http/routes/api/v1/user.routes";
import { InstagramRoutes } from "@/http/routes/api/v1/instagram.routes";
import { InstagramCallbackRoutes } from "@/http/routes/api/v1/instagram-callback.routes";
import { InstagramComplianceRoutes } from "@/http/routes/api/v1/instagram-compliance.routes";
import { PublicationRoutes } from "@/http/routes/api/v1/publication.routes";
import { AdminRoutes } from "@/http/routes/api/v1/admin.routes";
import { WalletRoutes } from "@/http/routes/api/v1/wallet.routes";
import { OmegaPayWebhookRoutes } from "@/http/routes/api/v1/omegapay-webhook.routes";
import { AccountSlotRoutes } from "@/http/routes/api/v1/account-slot.routes";
import { EmailVerificationRoutes } from "@/http/routes/api/v1/email-verification.routes";
import { buildPublicObjectRoutes } from "@/http/routes/api/v1/public-object.routes";
import { registerGlobalApiErrorHandler } from "@/http/utils/register-global-api-error-handler";
import { PublicationWorker } from "@/infra/queue/publication-queue";
import { MetaAppConfigRoutes } from "@/http/routes/api/v1/meta-app-config.routes";

export class AppService {
  private readonly env = EnvService.getInstance();
  private readonly serverClient = createHttpServerClient();

  start(): void {
    const app = this.serverClient.getApp();

    const publicationWorker = new PublicationWorker();

    app
      .use(
        cors({
          origin: this.env.corsOrigin,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          credentials: true,
          allowedHeaders: ["Content-Type", "Authorization"],
        }),
      )
      .use(
        swagger({
          documentation: {
            info: {
              title: "SolixPost API",
              version: "0.1.0",
              description:
                "API para publicação centralizada de posts e stories no Instagram.",
            },
          },
        }),
      );

    app.use(buildPublicObjectRoutes());

    app.group("/api/v1", (group) =>
      group
        .use(new HealthRoutes(this.serverClient).build())
        .use(new InstagramCallbackRoutes(this.serverClient).build())
        .use(new InstagramComplianceRoutes(this.serverClient).build())
        .use(new OmegaPayWebhookRoutes(this.serverClient).build())
        .use(new UserRoutes(this.serverClient).build())
        .use(new EmailVerificationRoutes(this.serverClient).build())
        .use(new InstagramRoutes(this.serverClient).build())
        .use(new MetaAppConfigRoutes(this.serverClient).build())
        .use(new PublicationRoutes(this.serverClient).build())
        .use(new WalletRoutes(this.serverClient).build())
        .use(new AccountSlotRoutes(this.serverClient).build())
        .use(new AdminRoutes(this.serverClient).build()),
    );

    registerGlobalApiErrorHandler(app);

    app.listen(this.env.port, ({ hostname, port }) => {
      console.log(`Server running at http://${hostname}:${port}`);
      console.log(`Swagger available at http://${hostname}:${port}/swagger`);
      console.log(`Better Auth available at http://${hostname}:${port}/api/auth`);
      console.log(`Publication worker started`);
    });

    process.on("SIGTERM", async () => {
      await publicationWorker.close();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      await publicationWorker.close();
      process.exit(0);
    });
  }
}

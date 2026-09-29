import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { AppContainer } from "@/composition/app.container";
import { EnvService } from "@/infra/config/env.service";
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
import { PublicObjectRoutes } from "@/http/routes/api/v1/public-object.routes";
import { registerGlobalApiErrorHandler } from "@/http/utils/register-global-api-error-handler";
import { MetaAppConfigRoutes } from "@/http/routes/api/v1/meta-app-config.routes";

export class AppService {
  private readonly env = EnvService.getInstance();
  private readonly serverClient = createHttpServerClient();
  private readonly container = AppContainer.create();

  start(): void {
    const app = this.serverClient.getApp();
    const publicationWorker = this.container.publicationWorker;

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
              title: "PlanejaPost API",
              version: "0.1.0",
              description:
                "API para publicação centralizada de posts e stories no Instagram.",
            },
          },
        }),
      );

    app.use(new PublicObjectRoutes(this.serverClient, this.container).build());

    app.group("/api/v1", (group) =>
      group
        .use(new HealthRoutes(this.serverClient, this.container).build())
        .use(new InstagramCallbackRoutes(this.serverClient, this.container).build())
        .use(new InstagramComplianceRoutes(this.serverClient, this.container).build())
        .use(new OmegaPayWebhookRoutes(this.serverClient, this.container).build())
        .use(new UserRoutes(this.serverClient, this.container).build())
        .use(new EmailVerificationRoutes(this.serverClient, this.container).build())
        .use(new InstagramRoutes(this.serverClient, this.container).build())
        .use(new MetaAppConfigRoutes(this.serverClient, this.container).build())
        .use(new PublicationRoutes(this.serverClient, this.container).build())
        .use(new WalletRoutes(this.serverClient, this.container).build())
        .use(new AccountSlotRoutes(this.serverClient, this.container).build())
        .use(new AdminRoutes(this.serverClient, this.container).build()),
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

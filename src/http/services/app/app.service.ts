import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { AppContainer } from "@/composition/app.container";
import { EnvService } from "@/infra/config/env.service";
import { createHttpServerClient } from "@/http/client";
import { HealthRoutes } from "@/http/routes/api/v1/health.routes";
import { UserRoutes } from "@/http/routes/api/v1/user.routes";
import { PublicationRoutes } from "@/http/routes/api/v1/publication.routes";
import { AdminRoutes } from "@/http/routes/api/v1/admin.routes";
import { WalletRoutes } from "@/http/routes/api/v1/wallet.routes";
import { OmegaPayWebhookRoutes } from "@/http/routes/api/v1/omegapay-webhook.routes";
import { ZernioWebhookRoutes } from "@/http/routes/api/v1/zernio-webhook.routes";
import { AccountSlotRoutes } from "@/http/routes/api/v1/account-slot.routes";
import { EmailVerificationRoutes } from "@/http/routes/api/v1/email-verification.routes";
import { PublicObjectRoutes } from "@/http/routes/api/v1/public-object.routes";
import { SocialRoutes } from "@/http/routes/api/v1/social.routes";
import { registerGlobalApiErrorHandler } from "@/http/utils/register-global-api-error-handler";

export class AppService {
  private readonly env = EnvService.getInstance();
  private readonly serverClient = createHttpServerClient();
  private readonly container = AppContainer.create();

  start(): void {
    const app = this.serverClient.getApp();

    app
      .use(
        cors({
          origin: this.env.corsOrigin,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          credentials: true,
          allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Zernio-Signature",
            "X-Zernio-Event",
            "X-Zernio-Event-Id",
            "X-Zernio-Event-Type",
          ],
        }),
      )
      .use(
        swagger({
          documentation: {
            info: {
              title: "PlanejaPost API",
              version: "0.1.0",
              description:
                "API para publicação centralizada em múltiplas redes sociais via Zernio.",
            },
          },
        }),
      );

    app.use(new PublicObjectRoutes(this.serverClient, this.container).build());

    app.group("/api/v1", (group) =>
      group
        .use(new HealthRoutes(this.serverClient, this.container).build())
        .use(new OmegaPayWebhookRoutes(this.serverClient, this.container).build())
        .use(new ZernioWebhookRoutes(this.serverClient, this.container).build())
        .use(new UserRoutes(this.serverClient, this.container).build())
        .use(new EmailVerificationRoutes(this.serverClient, this.container).build())
        .use(new SocialRoutes(this.serverClient, this.container).build())
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
    });
  }
}

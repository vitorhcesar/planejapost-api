import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { AppContainer } from "@/composition/app.container";
import { EnvService } from "@/infra/config/env.service";
import { createHttpServerClient } from "@/http/client";
import { HealthRoutes } from "@/http/routes/api/v1/health.routes";
import { UserRoutes } from "@/http/routes/api/v1/user.routes";
import { PublicationRoutes } from "@/http/routes/api/v1/publication.routes";
import { AdminRoutes } from "@/http/routes/api/v1/admin.routes";
import { OasyfyWebhookRoutes } from "@/http/routes/api/v1/oasyfy-webhook.routes";
import { StripeWebhookRoutes } from "@/http/routes/api/v1/stripe-webhook.routes";
import { ZernioWebhookRoutes } from "@/http/routes/api/v1/zernio-webhook.routes";
import { AccountSlotRoutes } from "@/http/routes/api/v1/account-slot.routes";
import { EmailVerificationRoutes } from "@/http/routes/api/v1/email-verification.routes";
import { SocialRoutes } from "@/http/routes/api/v1/social.routes";
import { WorkspaceRoutes } from "@/http/routes/api/v1/workspace.routes";
import { SubscriptionRoutes } from "@/http/routes/api/v1/subscription.routes";
import { registerGlobalApiErrorHandler } from "@/http/utils/register-global-api-error-handler";
import { registerHttpRequestLogger } from "@/http/utils/register-http-request-logger";
import { logServerStartup } from "@/infra/logging/log-server-startup";
import { SubscriptionSchedulerService } from "@/infra/subscription/subscription-scheduler.service";

export class AppService {
  private readonly env = EnvService.getInstance();
  private readonly serverClient = createHttpServerClient();
  private readonly container = AppContainer.create();
  private readonly subscriptionScheduler = new SubscriptionSchedulerService(
    this.container.useCases.subscription.jobs,
    this.container.infrastructure.logger,
  );

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
            "Stripe-Signature",
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

    app.group("/api/v1", (group) =>
      group
        .use(new HealthRoutes(this.serverClient, this.container).build())
        .use(new OasyfyWebhookRoutes(this.serverClient, this.container).build())
        .use(new StripeWebhookRoutes(this.serverClient, this.container).build())
        .use(new ZernioWebhookRoutes(this.serverClient, this.container).build())
        .use(new UserRoutes(this.serverClient, this.container).build())
        .use(new EmailVerificationRoutes(this.serverClient, this.container).build())
        .use(new SocialRoutes(this.serverClient, this.container).build())
        .use(new WorkspaceRoutes(this.serverClient, this.container).build())
        .use(new PublicationRoutes(this.serverClient, this.container).build())
        .use(new SubscriptionRoutes(this.serverClient, this.container).build())
        .use(new AccountSlotRoutes(this.serverClient, this.container).build())
        .use(new AdminRoutes(this.serverClient, this.container).build()),
    );

    const logger = this.container.infrastructure.logger;

    registerHttpRequestLogger(app, logger);
    registerGlobalApiErrorHandler(app, logger);

    this.subscriptionScheduler.start();

    app.listen(this.env.port, ({ hostname, port }) => {
      logServerStartup(logger, {
        hostname: hostname ?? "localhost",
        port: port ?? this.env.port,
        publicApiUrl: this.env.publicApiUrl,
      });
    });
  }
}

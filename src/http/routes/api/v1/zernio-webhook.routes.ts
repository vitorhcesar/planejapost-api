import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import { verifyZernioWebhookSignature } from "@/infra/zernio/zernio.client";
import { EnvService } from "@/infra/config/env.service";

const ZERNIO_WEBHOOK_SCOPE = "Zernio Webhook";

export class ZernioWebhookRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { handleWebhook } = this.container.useCases.zernio;
    const logger = this.container.infrastructure.logger;
    const env = EnvService.getInstance();

    route.post(
      "/webhooks/zernio",
      async (context) => {
        const rawBody = await context.request.text();

        const signatureHeader = context.request.headers.get("x-zernio-signature");

        const isValidSignature = verifyZernioWebhookSignature({
          rawBody,
          signature: signatureHeader,
          secret: env.zernioWebhookSecret,
        });

        if (!isValidSignature) {
          logger.error(
            ZERNIO_WEBHOOK_SCOPE,
            "Assinatura inválida",
            new Error("invalid_signature"),
            {
              temAssinatura: Boolean(signatureHeader),
              bytes: rawBody.length,
            },
          );

          throw new AppError(
            "Assinatura de webhook Zernio inválida",
            403,
            "zernio_webhook_invalid_signature",
          );
        }

        const payload = JSON.parse(rawBody) as Record<string, unknown>;

        const eventId =
          context.request.headers.get("x-zernio-event-id") ??
          (typeof payload.id === "string" ? payload.id : null);

        const eventType =
          context.request.headers.get("x-zernio-event") ??
          context.request.headers.get("x-zernio-event-type") ??
          (typeof payload.event === "string" ? payload.event : null);

        if (!eventId || !eventType) {
          logger.warn(ZERNIO_WEBHOOK_SCOPE, "Headers ausentes", {
            eventId,
            eventType,
          });

          throw new AppError(
            "Headers de webhook Zernio ausentes",
            400,
            "zernio_webhook_headers_missing",
          );
        }

        logger.info(ZERNIO_WEBHOOK_SCOPE, "Webhook recebido", {
          evento: eventType,
          eventId,
        });

        try {
          const result = await handleWebhook.execute({
            eventId,
            eventType,
            payload,
          });

          if (result.duplicate) {
            return this.successResponse("Evento duplicado ignorado", result, 200);
          }

          return this.successResponse("Webhook Zernio recebido", result, 200);
        } catch (error) {
          logger.error(ZERNIO_WEBHOOK_SCOPE, "Erro inesperado no handler HTTP", error, {
            evento: eventType,
            eventId,
          });
          throw error;
        }
      },
      { parse: "none" },
    );

    return route;
  }
}

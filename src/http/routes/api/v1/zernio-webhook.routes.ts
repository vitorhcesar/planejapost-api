import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import { verifyZernioWebhookSignature } from "@/infra/zernio/zernio.client";
import { EnvService } from "@/infra/config/env.service";

export class ZernioWebhookRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { handleWebhook } = this.container.useCases.zernio;
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
          throw new AppError(
            "Headers de webhook Zernio ausentes",
            400,
            "zernio_webhook_headers_missing",
          );
        }

        const result = await handleWebhook.execute({
          eventId,
          eventType,
          payload,
        });

        return this.successResponse(
          result.duplicate ? "Evento duplicado ignorado" : "Webhook Zernio recebido",
          result,
          200,
        );
      },
      { parse: "none" },
    );

    return route;
  }
}

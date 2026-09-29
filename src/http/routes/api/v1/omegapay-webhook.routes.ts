import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import { omegaPayWebhookBodySchema } from "@/http/validation/schemas/omegapay-webhook.schema";

export class OmegaPayWebhookRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { receiveWebhook } = this.container.useCases.omegapay;

    route.post("/webhooks/omegapay", async ({ body }) => {
      const parsedBody = omegaPayWebhookBodySchema.safeParse(body);

      if (!parsedBody.success) {
        throw new AppError(
          "Payload de webhook OmegaPay inválido",
          400,
          "validation",
          { issues: parsedBody.error.flatten() },
        );
      }

      const receipt = await receiveWebhook.execute(parsedBody.data);

      return this.successResponse("Webhook OmegaPay recebido", receipt, 200);
    });

    return route;
  }
}

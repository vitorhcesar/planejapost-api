import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";

export class StripeWebhookRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { receiveWebhook } = this.container.useCases.stripe;

    route.post("/webhooks/stripe", async (context) => {
      const signature = context.request.headers.get("stripe-signature");

      if (!signature) {
        return this.errorResponse("Assinatura ausente", 400, "stripe_signature_missing");
      }

      const payload = await context.request.text();
      await receiveWebhook.execute(payload, signature);
      return this.successResponse("Webhook recebido", null, 200);
    });

    return route;
  }
}

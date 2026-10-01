import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { oasyfyWebhookBodySchema } from "@/http/validation/schemas/oasyfy-webhook.schema";

export class OasyfyWebhookRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { receiveWebhook } = this.container.useCases.oasyfy;

    route.post("/webhooks/oasyfy", async (context) => {
      const payload = oasyfyWebhookBodySchema.parse(context.body);
      const receipt = await receiveWebhook.execute(payload);
      return this.successResponse("Webhook recebido", receipt, 200);
    });

    return route;
  }
}

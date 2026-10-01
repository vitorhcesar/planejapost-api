import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import {
  cancelSubscriptionBodySchema,
  changePlanBodySchema,
  payInvoiceBodySchema,
  subscribeBodySchema,
} from "@/http/validation/schemas/subscription.schema";

export class SubscriptionRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const publicRoute = this.serverClient.createPublicRoute();
    const userRoute = this.serverClient.createUserRoute();
    const {
      listPlans,
      getPaymentMethods,
      getMySubscription,
      subscribe,
      payInvoice,
      changePlan,
      cancel,
    } = this.container.useCases.subscription;

    publicRoute.get("/plans", async () => {
      const plans = await listPlans.execute();
      return this.successResponse("OK", plans, 200);
    });

    publicRoute.get("/billing/payment-methods", async () => {
      const methods = await getPaymentMethods.execute();
      return this.successResponse("OK", methods, 200);
    });

    userRoute.get("/subscriptions/me", async (context) => {
      const { authUserId } = getAuthContext(context);
      const subscription = await getMySubscription.execute(authUserId!);
      return this.successResponse("OK", subscription, 200);
    });

    userRoute.post("/subscriptions/subscribe", async (context) => {
      const { authUserId } = getAuthContext(context);
      const body = subscribeBodySchema.parse(context.body);
      const result = await subscribe.execute({
        userId: authUserId!,
        planId: body.planId,
        paymentMethod: body.paymentMethod,
        client: body.client,
      });
      return this.successResponse("Assinatura iniciada", result, 201);
    });

    userRoute.post("/subscriptions/invoices/:invoiceId/pay", async (context) => {
      const { authUserId } = getAuthContext(context);
      const { invoiceId } = context.params;
      const body = payInvoiceBodySchema.parse(context.body);
      const result = await payInvoice.execute({
        userId: authUserId!,
        invoiceId,
        paymentMethod: body.paymentMethod,
        client: body.client,
      });
      return this.successResponse("Pagamento iniciado", result, 200);
    });

    userRoute.post("/subscriptions/change-plan", async (context) => {
      const { authUserId } = getAuthContext(context);
      const body = changePlanBodySchema.parse(context.body);
      await changePlan.execute({ userId: authUserId!, planId: body.planId });
      return this.successResponse("Plano alterado", null, 200);
    });

    userRoute.post("/subscriptions/cancel", async (context) => {
      const { authUserId } = getAuthContext(context);
      cancelSubscriptionBodySchema.parse(context.body);
      await cancel.execute(authUserId!);
      return this.successResponse("Cancelamento agendado", null, 200);
    });

    return publicRoute.use(userRoute);
  }
}

import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { createWalletPixRechargeBodySchema } from "@/http/validation/schemas/wallet.schema";

export class WalletRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const { getBalance, createPixRecharge } = this.container.useCases.wallet;

    route.get("/wallet", async (context) => {
      const { authUserId } = getAuthContext(context);
      const wallet = await getBalance.execute(authUserId!);
      return this.successResponse("OK", wallet, 200);
    });

    route.post("/wallet/recharges/pix", async (context) => {
      const { authUserId } = getAuthContext(context);
      const body = createWalletPixRechargeBodySchema.parse(context.body);
      const recharge = await createPixRecharge.execute({
        userId: authUserId!,
        amount: body.amount,
        client: body.client,
      });

      return this.successResponse("Recarga PIX criada", recharge, 201);
    });

    route.get("/wallet/recharges/:rechargeId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const { rechargeId } = context.params;
      const recharge = await createPixRecharge.getRechargeForUser(
        authUserId!,
        rechargeId,
      );

      return this.successResponse("OK", recharge, 200);
    });

    return route;
  }
}

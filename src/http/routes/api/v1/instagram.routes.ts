import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { getAuthContext } from "@/http/client";
import { AppError } from "@/domain/errors/app.error";
import { instagramConnectQuerySchema } from "@/http/validation/schemas/account-slot.schema";

export class InstagramRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const {
      createConnectSession,
      listConnectedAccounts,
      disconnectAccount,
    } = this.container.useCases.instagram;

    route.get("/instagram/connect", async (context) => {
      const { authUserId } = getAuthContext(context);
      const query = instagramConnectQuerySchema.parse(context.query);
      const session = await createConnectSession.execute(
        authUserId!,
        query.slotId,
      );

      return this.successResponse("OK", session, 200);
    });

    route.get("/instagram/accounts", async (context) => {
      const { authUserId } = getAuthContext(context);
      const accounts = await listConnectedAccounts.execute(authUserId!);

      return this.successResponse("OK", accounts, 200);
    });

    route.delete("/instagram/accounts/:accountId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const accountId = context.params.accountId;

      if (!accountId) {
        throw new AppError("Conta Instagram inválida", 400, "invalid_account_id");
      }

      await disconnectAccount.execute(authUserId!, accountId);

      return this.successResponse("Conta desconectada com sucesso", null, 200);
    });

    return route;
  }
}

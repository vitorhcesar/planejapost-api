import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";

export class AccountSlotRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const { list } = this.container.useCases.accountSlot;

    route.get("/slots", async (context) => {
      const { authUserId } = getAuthContext(context);
      const slots = await list.execute(authUserId!);
      return this.successResponse("OK", slots, 200);
    });

    return route;
  }
}

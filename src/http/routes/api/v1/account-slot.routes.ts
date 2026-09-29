import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import { purchaseAccountSlotsBodySchema } from "@/http/validation/schemas/account-slot.schema";

export class AccountSlotRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const { getPricing, list, purchase, renew } =
      this.container.useCases.accountSlot;

    route.get("/slots/pricing", async () => {
      const pricing = getPricing.execute();
      return this.successResponse("OK", pricing, 200);
    });

    route.get("/slots", async (context) => {
      const { authUserId } = getAuthContext(context);
      const slots = await list.execute(authUserId!);
      return this.successResponse("OK", slots, 200);
    });

    route.post("/slots/purchase", async (context) => {
      const { authUserId } = getAuthContext(context);
      const body = purchaseAccountSlotsBodySchema.parse(context.body);

      const result = await purchase.execute({
        userId: authUserId!,
        quantity: body.quantity,
        combo: body.combo,
      });

      return this.successResponse("Slots adquiridos com sucesso", result, 201);
    });

    route.post("/slots/:slotId/renew", async (context) => {
      const { authUserId } = getAuthContext(context);
      const { slotId } = context.params;

      if (!slotId) {
        throw new AppError("Slot inválido", 400, "invalid_slot_id");
      }

      const result = await renew.execute(authUserId!, slotId);
      return this.successResponse("Slot renovado com sucesso", result, 200);
    });

    return route;
  }
}

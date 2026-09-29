import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { getAuthContext } from "@/http/client";
import { deleteUserAccountBodySchema } from "@/http/validation/schemas/user.schema";
import { AppError } from "@/domain/errors/app.error";

export class UserRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const { getAuthenticatedUser, deleteAccount } = this.container.useCases.user;

    route.get("/me", async (context) => {
      const { authUserId } = getAuthContext(context);
      const user = await getAuthenticatedUser.execute(authUserId!);
      return this.successResponse("OK", user, 200);
    });

    route.post("/me/delete-account", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedBody = deleteUserAccountBodySchema.safeParse(context.body);

      if (!parsedBody.success) {
        throw new AppError("Confirmação inválida", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      await deleteAccount.execute(authUserId!);

      return this.successResponse("Conta excluída com sucesso", null, 200);
    });

    return route;
  }
}

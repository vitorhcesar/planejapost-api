import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import { instagramConnectCallbackQuerySchema } from "@/http/validation/schemas/publication.schema";

export class InstagramCallbackRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { completeConnect } = this.container.useCases.instagram;
    const { frontendOrigin } = this.container.infrastructure;

    route.get("/instagram/connect/callback", async (context) => {
      const redirectUrl = new URL("/instagram/connect/success", frontendOrigin);

      try {
        const parsedQuery = instagramConnectCallbackQuerySchema.safeParse(
          context.query,
        );

        if (!parsedQuery.success) {
          throw new AppError("Parâmetros OAuth inválidos", 400, "validation");
        }

        await completeConnect.execute(parsedQuery.data);
      } catch (error) {
        const safeErrorCode =
          error instanceof AppError && error.code ? error.code : "oauth_failed";
        redirectUrl.searchParams.set("error", safeErrorCode);
      }

      return Response.redirect(redirectUrl.toString(), 302);
    });

    return route;
  }
}

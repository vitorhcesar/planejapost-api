import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import {
  metaAppConfigBodySchema,
  rotateMetaAppSecretBodySchema,
} from "@/http/validation/schemas/meta-app-config.schema";

export class MetaAppConfigRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const { get, create, replace, rotateSecret, delete: deleteConfig } =
      this.container.useCases.metaAppConfig;
    const { metaAppRuntimeOptions } = this.container.infrastructure;

    route.get("/meta-app-config/setup", (context) => {
      getAuthContext(context);

      return this.successResponse(
        "OK",
        {
          redirectUri: metaAppRuntimeOptions.redirectUri,
          requestedScopes: metaAppRuntimeOptions.requestedScopes,
        },
        200,
      );
    });

    route.get("/meta-app-config", async (context) => {
      const { authUserId } = getAuthContext(context);
      const config = await get.execute(authUserId!);

      return this.successResponse("OK", config, 200);
    });

    route.post("/meta-app-config", async (context) => {
      const { authUserId } = getAuthContext(context);
      const input = metaAppConfigBodySchema.parse(context.body);
      const config = await create.execute(authUserId!, input);

      return this.successResponse("Configuração Meta criada", config, 201);
    });

    route.post("/meta-app-config/replace", async (context) => {
      const { authUserId } = getAuthContext(context);
      const input = metaAppConfigBodySchema.parse(context.body);
      const config = await replace.execute(authUserId!, input);

      return this.successResponse("Configuração Meta substituída", config, 201);
    });

    route.patch("/meta-app-config/:id/secret", async (context) => {
      const { authUserId } = getAuthContext(context);
      const input = rotateMetaAppSecretBodySchema.parse(context.body);

      await rotateSecret.execute(
        authUserId!,
        context.params.id,
        input.appSecret,
      );

      return this.successResponse("App Secret atualizado", null, 200);
    });

    route.delete("/meta-app-config/:id", async (context) => {
      const { authUserId } = getAuthContext(context);
      await deleteConfig.execute(authUserId!, context.params.id);

      return this.successResponse("Configuração Meta removida", null, 200);
    });

    return route;
  }
}

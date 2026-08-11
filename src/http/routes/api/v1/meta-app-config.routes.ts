import {
  CreateMetaAppConfigUseCase,
  DeleteMetaAppConfigUseCase,
  GetMetaAppConfigUseCase,
  ReplaceMetaAppConfigUseCase,
  RotateMetaAppSecretUseCase,
} from "@/app/usecases/meta-app-config/meta-app-config.usecases";
import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { EnvService } from "@/http/services/env/env.service";
import {
  metaAppConfigBodySchema,
  rotateMetaAppSecretBodySchema,
} from "@/http/validation/schemas/meta-app-config.schema";
import { PrismaMetaAppConfigRepository } from "@/infra/database/prisma/repositories/prisma-meta-app-config.repository";

export class MetaAppConfigRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const env = EnvService.getInstance();
    const repository = new PrismaMetaAppConfigRepository();
    const options = {
      redirectUri: env.instagramRedirectUri,
      requestedScopes: env.instagramOAuthScopes.split(",").filter(Boolean),
      publicApiUrl: env.publicApiUrl,
    };

    const getUseCase = new GetMetaAppConfigUseCase(
      repository,
      env.publicApiUrl,
    );
    const createUseCase = new CreateMetaAppConfigUseCase(repository, options);
    const replaceUseCase = new ReplaceMetaAppConfigUseCase(repository, options);
    const rotateSecretUseCase = new RotateMetaAppSecretUseCase(repository);
    const deleteUseCase = new DeleteMetaAppConfigUseCase(repository);

    route.get("/meta-app-config/setup", (context) => {
      getAuthContext(context);

      return this.successResponse(
        "OK",
        {
          redirectUri: options.redirectUri,
          requestedScopes: options.requestedScopes,
        },
        200,
      );
    });

    route.get("/meta-app-config", async (context) => {
      const { authUserId } = getAuthContext(context);
      const config = await getUseCase.execute(authUserId!);

      return this.successResponse("OK", config, 200);
    });

    route.post("/meta-app-config", async (context) => {
      const { authUserId } = getAuthContext(context);
      const input = metaAppConfigBodySchema.parse(context.body);
      const config = await createUseCase.execute(authUserId!, input);

      return this.successResponse("Configuração Meta criada", config, 201);
    });

    route.post("/meta-app-config/replace", async (context) => {
      const { authUserId } = getAuthContext(context);
      const input = metaAppConfigBodySchema.parse(context.body);
      const config = await replaceUseCase.execute(authUserId!, input);

      return this.successResponse("Configuração Meta substituída", config, 201);
    });

    route.patch("/meta-app-config/:id/secret", async (context) => {
      const { authUserId } = getAuthContext(context);
      const input = rotateMetaAppSecretBodySchema.parse(context.body);

      await rotateSecretUseCase.execute(
        authUserId!,
        context.params.id,
        input.appSecret,
      );

      return this.successResponse("App Secret atualizado", null, 200);
    });

    route.delete("/meta-app-config/:id", async (context) => {
      const { authUserId } = getAuthContext(context);
      await deleteUseCase.execute(authUserId!, context.params.id);

      return this.successResponse("Configuração Meta removida", null, 200);
    });

    return route;
  }
}

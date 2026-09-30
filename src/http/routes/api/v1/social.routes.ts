import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import {
  completeSocialConnectBodySchema,
  createSocialConnectSessionBodySchema,
  socialConnectSelectionQuerySchema,
} from "@/http/validation/schemas/social.schema";

export class SocialRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const {
      createConnectSession,
      completeConnect,
      listConnectedAccounts,
      disconnectAccount,
      listSelectionOptions,
    } = this.container.useCases.social;

    route.post("/social/connect-sessions", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedBody = createSocialConnectSessionBodySchema.safeParse(context.body);

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const session = await createConnectSession.execute({
        userId: authUserId!,
        slotId: parsedBody.data.slotId,
        platform: parsedBody.data.platform,
        loginMethod: parsedBody.data.loginMethod,
      });

      return this.successResponse("Sessão de conexão criada", session, 201);
    });

    route.post("/social/connect-sessions/:sessionId/complete", async (context) => {
      const { authUserId } = getAuthContext(context);
      const sessionId = context.params.sessionId;
      const parsedBody = completeSocialConnectBodySchema.safeParse(context.body);

      if (!sessionId) {
        throw new AppError("Sessão inválida", 400, "invalid_session_id");
      }

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const account = await completeConnect.execute({
        userId: authUserId!,
        sessionId,
        ...parsedBody.data,
      });

      return this.successResponse("Conta conectada com sucesso", account, 200);
    });

    route.get("/social/connect-sessions/:sessionId/selection-options", async (context) => {
      const { authUserId } = getAuthContext(context);
      const sessionId = context.params.sessionId;
      const query = socialConnectSelectionQuerySchema.parse(context.query);

      if (!sessionId) {
        throw new AppError("Sessão inválida", 400, "invalid_session_id");
      }

      const options = await listSelectionOptions.execute({
        userId: authUserId!,
        sessionId,
        tempToken: query.tempToken,
      });

      return this.successResponse("OK", options, 200);
    });

    route.get("/social/accounts", async (context) => {
      const { authUserId } = getAuthContext(context);
      const accounts = await listConnectedAccounts.execute(authUserId!);

      return this.successResponse("OK", accounts, 200);
    });

    route.delete("/social/accounts/:accountId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const accountId = context.params.accountId;

      if (!accountId) {
        throw new AppError("Conta social inválida", 400, "invalid_account_id");
      }

      await disconnectAccount.execute(authUserId!, accountId);

      return this.successResponse("Conta desconectada com sucesso", null, 200);
    });

    return route;
  }
}

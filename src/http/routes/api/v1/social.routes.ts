import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import {
  completeSocialConnectBodySchema,
  createSocialConnectSessionBodySchema,
  listSocialAccountsQuerySchema,
  moveSocialAccountWorkspaceBodySchema,
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
      moveAccountToWorkspace,
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
        workspaceId: parsedBody.data.workspaceId,
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
      const parsedQuery = listSocialAccountsQuerySchema.safeParse(context.query);

      if (!parsedQuery.success) {
        throw new AppError("Parâmetros inválidos", 400, "validation", {
          issues: parsedQuery.error.flatten(),
        });
      }

      const accounts = await listConnectedAccounts.execute(authUserId!, {
        workspaceId: parsedQuery.data.workspaceId,
      });

      return this.successResponse("OK", accounts, 200);
    });

    route.patch("/social/accounts/:accountId/workspace", async (context) => {
      const { authUserId } = getAuthContext(context);
      const accountId = context.params.accountId;
      const parsedBody = moveSocialAccountWorkspaceBodySchema.safeParse(context.body);

      if (!accountId) {
        throw new AppError("Conta social inválida", 400, "invalid_account_id");
      }

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      await moveAccountToWorkspace.execute({
        userId: authUserId!,
        accountId,
        workspaceId: parsedBody.data.workspaceId,
      });

      return this.successResponse("Conta movida para o workspace", null, 200);
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

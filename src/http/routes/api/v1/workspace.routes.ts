import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import {
  archiveWorkspaceBodySchema,
  createWorkspaceBodySchema,
  listWorkspacesQuerySchema,
  updateWorkspaceBodySchema,
} from "@/http/validation/schemas/workspace.schema";

export class WorkspaceRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const {
      list,
      create,
      update,
      archive,
    } = this.container.useCases.workspace;

    route.get("/workspaces", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedQuery = listWorkspacesQuerySchema.safeParse(context.query);

      if (!parsedQuery.success) {
        throw new AppError("Parâmetros inválidos", 400, "validation", {
          issues: parsedQuery.error.flatten(),
        });
      }

      const result = await list.execute(authUserId!, {
        includeArchived: parsedQuery.data.includeArchived,
      });

      return this.successResponse("OK", result, 200);
    });

    route.post("/workspaces", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedBody = createWorkspaceBodySchema.safeParse(context.body);

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const workspace = await create.execute({
        userId: authUserId!,
        ...parsedBody.data,
      });

      return this.successResponse("Workspace criado", workspace, 201);
    });

    route.patch("/workspaces/:workspaceId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const workspaceId = context.params.workspaceId;
      const parsedBody = updateWorkspaceBodySchema.safeParse(context.body);

      if (!workspaceId) {
        throw new AppError("Workspace inválido", 400, "invalid_workspace_id");
      }

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const workspace = await update.execute({
        userId: authUserId!,
        workspaceId,
        ...parsedBody.data,
      });

      return this.successResponse("Workspace atualizado", workspace, 200);
    });

    route.delete("/workspaces/:workspaceId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const workspaceId = context.params.workspaceId;
      const parsedBody = archiveWorkspaceBodySchema.safeParse(context.body ?? {});

      if (!workspaceId) {
        throw new AppError("Workspace inválido", 400, "invalid_workspace_id");
      }

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      await archive.execute({
        userId: authUserId!,
        workspaceId,
        moveAccountsToWorkspaceId: parsedBody.data.moveAccountsToWorkspaceId,
      });

      return this.successResponse("Workspace arquivado", null, 200);
    });

    return route;
  }
}

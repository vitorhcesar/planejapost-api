import { Elysia, type Context } from "elysia";
import { AppError } from "@/domain/errors/app.error";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import type { IAuthContext } from "@/http/middleware/auth-session.middleware";

type TAuthRequestContext = Context & IAuthContext;

export function createRequireAuthenticatedUserMiddleware() {
  return new Elysia({ name: "require-auth" }).onBeforeHandle((context) => {
    const { authUserId } = context as TAuthRequestContext;

    if (!authUserId) {
      throw new AppError("Não autenticado", 401, "unauthorized");
    }
  });
}

export function createRequireAdminMiddleware() {
  return new Elysia({ name: "require-admin" }).onBeforeHandle((context) => {
    const { authUserId, authUserRole } = context as TAuthRequestContext;

    if (!authUserId) {
      throw new AppError("Não autenticado", 401, "unauthorized");
    }

    if (authUserRole !== AppRoleEnum.ADMIN) {
      throw new AppError("Acesso negado", 403, "forbidden");
    }
  });
}

export function getAuthContext(context: Context): TAuthRequestContext {
  return context as TAuthRequestContext;
}

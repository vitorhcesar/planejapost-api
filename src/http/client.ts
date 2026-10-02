import { Elysia, type Context } from "elysia";
import type { ILogger } from "@/domain/services/logger.service";
import { auth } from "@/infra/auth/client";
import { createAuthSessionUserMiddleware } from "@/http/middleware/auth-session.middleware";
import {
  createRequireAdminMiddleware,
  createRequireAuthenticatedUserMiddleware,
  getAuthContext,
} from "@/http/middleware/authorization.middleware";
import { registerGlobalApiErrorHandler } from "@/http/utils/register-global-api-error-handler";

export type { IAuthContext } from "@/http/middleware/auth-session.middleware";
export { getAuthContext };

export function createBetterAuthPlugin() {
  return new Elysia({ name: "better-auth" }).mount(auth.handler);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TElysiaApp = Elysia<any, any, any, any, any, any, any>;

export function createHttpServerClient(logger: ILogger): HttpServerClient {
  const app = registerGlobalApiErrorHandler(
    new Elysia()
      .use(createAuthSessionUserMiddleware())
      .use(createBetterAuthPlugin()) as TElysiaApp,
    logger,
  );

  return new HttpServerClient(app as unknown as Elysia);
}

export class HttpServerClient {
  constructor(private readonly app: Elysia) {}

  getApp(): Elysia {
    return this.app;
  }

  createPublicRoute(): Elysia {
    return new Elysia();
  }

  createUserRoute(): Elysia {
    return new Elysia().use(createRequireAuthenticatedUserMiddleware());
  }

  createAdminRoute(): Elysia {
    return new Elysia().use(createRequireAdminMiddleware());
  }
}

export type TAuthRequestContext = Context &
  import("@/http/middleware/auth-session.middleware").IAuthContext;

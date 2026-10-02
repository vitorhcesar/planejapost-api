import type { IAppContainer } from "@/composition/app.container";
import { AppError } from "@/domain/errors/app.error";
import { mapPrismaErrorToAppError } from "@/domain/errors/map-prisma-error.util";
import type { Elysia } from "elysia";
import { ZodError } from "zod";

export interface IHttpSuccessResponse<TData> {
  status: number;
  message: string;
  data: TData;
}

export interface IHttpErrorResponse {
  status: number;
  message: string;
  error?: Record<string, unknown>;
  code?: string;
}

export type THttpRoute = ReturnType<Elysia["group"]>;

export abstract class BaseHttpRoute {
  constructor(
    protected readonly serverClient: HttpServerClientLike,
    protected readonly container: IAppContainer,
  ) {}

  abstract build(): THttpRoute;

  protected successResponse<TData>(
    message: string,
    data: TData,
    status = 200,
  ): IHttpSuccessResponse<TData> {
    return {
      status,
      message,
      data,
    };
  }

  protected errorResponse(
    message: string,
    status: number,
    code?: string,
    error?: Record<string, unknown>,
  ): IHttpErrorResponse {
    return {
      status,
      message,
      code,
      error,
    };
  }

  protected handleError(error: unknown): IHttpErrorResponse {
    if (error instanceof AppError) {
      return this.errorResponse(error.message, error.statusCode, error.code, error.data);
    }

    const prismaError = mapPrismaErrorToAppError(error);
    if (prismaError) {
      return this.errorResponse(
        prismaError.message,
        prismaError.statusCode,
        prismaError.code,
        prismaError.data,
      );
    }

    if (error instanceof ZodError) {
      return this.errorResponse("Dados inválidos", 422, "validation", {
        issues: error.flatten(),
      });
    }

    if (error instanceof Error) {
      return this.errorResponse(error.message, 400);
    }

    return this.errorResponse("Erro interno do servidor", 500, "internal_server_error");
  }

  protected getStatusFromError(error: unknown): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }

    const prismaError = mapPrismaErrorToAppError(error);
    if (prismaError) {
      return prismaError.statusCode;
    }

    if (error instanceof ZodError) {
      return 422;
    }

    return 500;
  }
}

export interface HttpServerClientLike {
  getApp(): Elysia;
  createPublicRoute(): Elysia;
  createUserRoute(): Elysia;
  createAdminRoute(): Elysia;
}

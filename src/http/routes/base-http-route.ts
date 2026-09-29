import type { IAppContainer } from "@/composition/app.container";
import type { Elysia } from "elysia";

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
}

export interface HttpServerClientLike {
  getApp(): Elysia;
  createPublicRoute(): Elysia;
  createUserRoute(): Elysia;
  createAdminRoute(): Elysia;
}

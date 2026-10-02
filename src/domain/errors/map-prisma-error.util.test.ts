import { describe, expect, test } from "bun:test";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { mapPrismaErrorToAppError } from "@/domain/errors/map-prisma-error.util";

describe("mapPrismaErrorToAppError", () => {
  test("maps unique constraint violation to 409", () => {
    const error = new PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.9.0",
    });

    const mapped = mapPrismaErrorToAppError(error);

    expect(mapped?.statusCode).toBe(409);
    expect(mapped?.code).toBe("prisma_p2002");
    expect(mapped?.message).toBe("Registro duplicado");
  });

  test("maps null constraint violation to 400", () => {
    const error = new PrismaClientKnownRequestError("Null constraint violation", {
      code: "P2011",
      clientVersion: "6.9.0",
    });

    const mapped = mapPrismaErrorToAppError(error);

    expect(mapped?.statusCode).toBe(400);
    expect(mapped?.code).toBe("prisma_p2011");
    expect(mapped?.message).toBe("Dados obrigatórios ausentes");
  });

  test("maps validation error to 400", () => {
    const error = new PrismaClientValidationError("Invalid data", {
      clientVersion: "6.9.0",
    });

    const mapped = mapPrismaErrorToAppError(error);

    expect(mapped?.statusCode).toBe(400);
    expect(mapped?.code).toBe("prisma_validation_error");
  });

  test("returns null for unknown errors", () => {
    expect(mapPrismaErrorToAppError(new Error("generic"))).toBeNull();
  });
});

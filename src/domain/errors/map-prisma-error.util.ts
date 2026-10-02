import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { AppError } from "@/domain/errors/app.error";

const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2002: "Registro duplicado",
  P2003: "Referência inválida",
  P2011: "Dados obrigatórios ausentes",
  P2014: "Relacionamento inválido",
  P2025: "Registro não encontrado",
};

export function mapPrismaErrorToAppError(error: unknown): AppError | null {
  if (error instanceof PrismaClientKnownRequestError) {
    const message =
      PRISMA_ERROR_MESSAGES[error.code] ?? "Erro ao processar operação no banco de dados";

    return new AppError(message, mapPrismaStatusCode(error.code), `prisma_${error.code.toLowerCase()}`, {
      prismaCode: error.code,
      meta: error.meta as Record<string, unknown>,
    });
  }

  if (error instanceof PrismaClientValidationError) {
    return new AppError("Dados inválidos para operação no banco de dados", 400, "prisma_validation_error");
  }

  return null;
}

function mapPrismaStatusCode(code: string): number {
  if (code === "P2002") return 409;
  if (code === "P2025") return 404;
  if (code === "P2003" || code === "P2011" || code === "P2014") return 400;

  return 500;
}

import { z } from "zod";

const appIdSchema = z
  .string()
  .trim()
  .regex(/^\d{5,30}$/, "App ID deve conter apenas números");

const appSecretSchema = z
  .string()
  .min(8, "App Secret deve ter pelo menos 8 caracteres")
  .max(512, "App Secret inválido");

export const metaAppConfigBodySchema = z.object({
  label: z.string().trim().min(2).max(100),
  appId: appIdSchema,
  appSecret: appSecretSchema,
});

export const rotateMetaAppSecretBodySchema = z.object({
  appSecret: appSecretSchema,
});

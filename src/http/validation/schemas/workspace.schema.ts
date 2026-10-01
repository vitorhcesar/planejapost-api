import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido (#RRGGBB)");

export const listWorkspacesQuerySchema = z.object({
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export const createWorkspaceBodySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  color: hexColorSchema.optional().nullable(),
});

export const updateWorkspaceBodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  color: hexColorSchema.optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const archiveWorkspaceBodySchema = z.object({
  moveAccountsToWorkspaceId: z.string().min(1).optional(),
});

export const moveSocialAccountWorkspaceBodySchema = z.object({
  workspaceId: z.string().min(1),
});

export type TCreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;
export type TUpdateWorkspaceBody = z.infer<typeof updateWorkspaceBodySchema>;
export type TArchiveWorkspaceBody = z.infer<typeof archiveWorkspaceBodySchema>;

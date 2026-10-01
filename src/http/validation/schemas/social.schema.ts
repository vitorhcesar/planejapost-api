import { z } from "zod";
import {
  PublicationDestinationScopeEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";

export const createSocialConnectSessionBodySchema = z.object({
  slotId: z.string().min(1),
  platform: z.nativeEnum(SocialPlatformEnum),
  workspaceId: z.string().min(1).optional(),
  loginMethod: z.string().min(1).optional(),
});

export const listSocialAccountsQuerySchema = z.object({
  workspaceId: z.string().min(1).optional(),
});

export const moveSocialAccountWorkspaceBodySchema = z.object({
  workspaceId: z.string().min(1),
});

export const completeSocialConnectBodySchema = z.object({
  accountId: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  tempToken: z.string().min(1).optional(),
  connectToken: z.string().min(1).optional(),
  step: z.string().min(1).optional(),
  selectionPayload: z.record(z.unknown()).optional(),
});

export const socialConnectSelectionQuerySchema = z.object({
  tempToken: z.string().min(1).optional(),
});

export type TCreateSocialConnectSessionBody = z.infer<
  typeof createSocialConnectSessionBodySchema
>;

export type TCompleteSocialConnectBody = z.infer<
  typeof completeSocialConnectBodySchema
>;

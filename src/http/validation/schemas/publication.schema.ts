import { z } from "zod";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTypeEnum,
  PublishModeEnum,
} from "@/domain/enums/publication.enum";
import { isAbsoluteMediaUrl } from "@/domain/utils/validate-media-url.util";

const mediaUrlSchema = z
  .string()
  .min(1)
  .refine(isAbsoluteMediaUrl, {
    message: "mediaUrl deve ser uma URL absoluta (http:// ou https://)",
  });

export const createPublicationBodySchema = z
  .object({
    type: z.nativeEnum(PublicationTypeEnum),
    destinationScope: z.nativeEnum(PublicationDestinationScopeEnum),
    workspaceId: z.string().min(1).optional(),
    caption: z.string().max(2200).optional().nullable(),
    mediaUrl: mediaUrlSchema.optional(),
    mediaUrls: z.array(mediaUrlSchema).min(1).max(10).optional(),
    socialConnectedAccountIds: z.array(z.string().min(1)).optional(),
    scheduledFor: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
    publishMode: z.nativeEnum(PublishModeEnum).optional(),
  })
  .superRefine((data, context) => {
    const hasMediaUrl = Boolean(data.mediaUrl);
    const hasMediaUrls = Boolean(data.mediaUrls && data.mediaUrls.length > 0);

    if (!hasMediaUrl && !hasMediaUrls) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mediaUrl ou mediaUrls é obrigatório",
        path: ["mediaUrls"],
      });
    }

    if (
      data.destinationScope === PublicationDestinationScopeEnum.SELECTED &&
      (!data.socialConnectedAccountIds ||
        data.socialConnectedAccountIds.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "socialConnectedAccountIds é obrigatório quando destinationScope é selected",
        path: ["socialConnectedAccountIds"],
      });
    }

    if (
      data.destinationScope === PublicationDestinationScopeEnum.WORKSPACE &&
      !data.workspaceId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "workspaceId é obrigatório quando destinationScope é workspace",
        path: ["workspaceId"],
      });
    }

    const isScheduled =
      data.publishMode === PublishModeEnum.SCHEDULED || Boolean(data.scheduledFor);

    if (isScheduled && !data.scheduledFor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scheduledFor é obrigatório para agendamento",
        path: ["scheduledFor"],
      });
    }
  });

export const listPublicationsQuerySchema = z.object({
  status: z.nativeEnum(PublicationStatusEnum).optional(),
  workspaceId: z.string().min(1).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

export const reschedulePublicationBodySchema = z.object({
  scheduledFor: z.string().min(1),
  timezone: z.string().min(1).optional(),
});

export type TCreatePublicationBody = z.infer<typeof createPublicationBodySchema>;
export type TListPublicationsQuery = z.infer<typeof listPublicationsQuerySchema>;
export type TReschedulePublicationBody = z.infer<typeof reschedulePublicationBodySchema>;

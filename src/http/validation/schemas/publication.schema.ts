import { z } from "zod";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTypeEnum,
  PublishModeEnum,
} from "@/domain/enums/publication.enum";

export const createPublicationBodySchema = z
  .object({
    type: z.nativeEnum(PublicationTypeEnum),
    destinationScope: z.nativeEnum(PublicationDestinationScopeEnum),
    caption: z.string().max(2200).optional().nullable(),
    objectKey: z.string().min(1).optional(),
    objectKeys: z.array(z.string().min(1)).min(1).max(10).optional(),
    socialConnectedAccountIds: z.array(z.string().min(1)).optional(),
    scheduledFor: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
    publishMode: z.nativeEnum(PublishModeEnum).optional(),
  })
  .superRefine((data, context) => {
    const hasObjectKey = Boolean(data.objectKey);
    const hasObjectKeys = Boolean(data.objectKeys && data.objectKeys.length > 0);

    if (!hasObjectKey && !hasObjectKeys) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "objectKey ou objectKeys é obrigatório",
        path: ["objectKeys"],
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

import { z } from "zod";
import {
  PublicationDestinationScopeEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";

export const createPublicationBodySchema = z
  .object({
    type: z.nativeEnum(PublicationTypeEnum),
    destinationScope: z.nativeEnum(PublicationDestinationScopeEnum),
    caption: z.string().max(2200).optional().nullable(),
    objectKey: z.string().min(1).optional(),
    objectKeys: z.array(z.string().min(1)).min(1).max(10).optional(),
    socialConnectedAccountIds: z.array(z.string().min(1)).optional(),
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
  });

export type TCreatePublicationBody = z.infer<typeof createPublicationBodySchema>;

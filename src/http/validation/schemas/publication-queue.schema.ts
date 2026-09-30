import { z } from "zod";

export const publicationQueueSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const upsertPublicationQueueBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: z.string().min(1),
  slots: z.array(publicationQueueSlotSchema).min(1).max(21),
  active: z.boolean().optional(),
});

export type TUpsertPublicationQueueBody = z.infer<
  typeof upsertPublicationQueueBodySchema
>;

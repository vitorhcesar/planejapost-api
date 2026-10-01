import { z } from "zod";

export const oasyfyWebhookBodySchema = z
  .object({
    event: z.string(),
    token: z.string(),
    transaction: z
      .object({
        id: z.string().optional(),
        status: z.string().optional(),
        metadata: z.union([z.record(z.unknown()), z.string()]).optional(),
      })
      .optional(),
  })
  .passthrough();

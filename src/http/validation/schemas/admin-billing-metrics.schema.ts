import { z } from "zod";

export const adminBillingMetricsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

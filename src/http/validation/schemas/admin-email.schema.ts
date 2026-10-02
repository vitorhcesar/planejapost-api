import { z } from "zod";

export const sendAdminOtpTestEmailBodySchema = z.object({
  email: z.string().email("E-mail inválido"),
  name: z.string().trim().min(1).max(120).optional(),
});

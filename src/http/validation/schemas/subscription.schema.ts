import { z } from "zod";
import { PaymentMethodEnum } from "@/domain/enums/subscription.enum";

export const subscribeBodySchema = z.object({
  planId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethodEnum),
  client: z
    .object({
      phone: z.string().min(8),
      document: z.string().min(11),
    })
    .optional(),
});

export const payInvoiceBodySchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethodEnum),
  client: z
    .object({
      phone: z.string().min(8),
      document: z.string().min(11),
    })
    .optional(),
});

export const changePlanBodySchema = z.object({
  planId: z.string().min(1),
});

export const cancelSubscriptionBodySchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});

export const updateBillingSettingsBodySchema = z.object({
  pixPaymentsEnabled: z.boolean().optional(),
  cardPaymentsEnabled: z.boolean().optional(),
  gracePeriodDays: z.number().int().positive().optional(),
  renewalReminderDays: z.array(z.number().int().positive()).optional(),
  invoiceGenerationLeadDays: z.number().int().positive().optional(),
});

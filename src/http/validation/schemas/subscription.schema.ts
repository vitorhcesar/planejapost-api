import { z } from "zod";
import { PaymentMethodEnum } from "@/domain/enums/subscription.enum";
import { isValidBrazilianCpf } from "@/shared/utils/is-valid-brazilian-cpf.util";

const pixClientSchema = z.object({
  phone: z
    .string()
    .min(8)
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone inválido"),
  document: z
    .string()
    .min(11)
    .refine((value) => isValidBrazilianCpf(value), "CPF inválido"),
});

export const subscribeBodySchema = z.object({
  planId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethodEnum),
  client: pixClientSchema.optional(),
});

export const payInvoiceBodySchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethodEnum),
  client: pixClientSchema.optional(),
});

export const changePlanBodySchema = z.object({
  planId: z.string().min(1),
});

export const cancelSubscriptionBodySchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});

export const createPixSmokeTestBodySchema = z.object({
  client: pixClientSchema,
});

export const adminMarkInvoicePaidBodySchema = z.object({
  action: z.literal("mark_paid"),
  reason: z.string().trim().min(10).max(500),
});

export const adminCancelInvoiceBodySchema = z.object({
  action: z.literal("cancel"),
});

export const adminUpdateInvoiceBodySchema = z.discriminatedUnion("action", [
  adminMarkInvoicePaidBodySchema,
  adminCancelInvoiceBodySchema,
]);

export const grantTrialSubscriptionBodySchema = z.object({
  planId: z.string().min(1),
});

export const adminCreateManualInvoiceBodySchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(["initial", "renewal", "upgrade"]).optional(),
  paymentMethod: z.nativeEnum(PaymentMethodEnum).optional(),
  dueAt: z.coerce.date().optional(),
});

export const updateBillingSettingsBodySchema = z.object({
  pixPaymentsEnabled: z.boolean().optional(),
  cardPaymentsEnabled: z.boolean().optional(),
  gracePeriodDays: z.number().int().positive().optional(),
  renewalReminderDays: z.array(z.number().int().positive()).optional(),
  invoiceGenerationLeadDays: z.number().int().positive().optional(),
});

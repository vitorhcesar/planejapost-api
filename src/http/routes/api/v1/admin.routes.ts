import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { getAuthContext } from "@/http/client";
import { AppError } from "@/domain/errors/app.error";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import {
  SubscriptionInvoiceTypeEnum,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";
import { sendAdminOtpTestEmailBodySchema } from "@/http/validation/schemas/admin-email.schema";
import { adminBillingMetricsQuerySchema } from "@/http/validation/schemas/admin-billing-metrics.schema";
import {
  adminCreateManualInvoiceBodySchema,
  adminUpdateInvoiceBodySchema,
  createPixSmokeTestBodySchema,
  grantTrialSubscriptionBodySchema,
  updateBillingSettingsBodySchema,
} from "@/http/validation/schemas/subscription.schema";
import { z } from "zod";

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const updateRoleBodySchema = z.object({
  role: z.enum([AppRoleEnum.CLIENT, AppRoleEnum.ADMIN]),
});

const listSubscriptionsQuerySchema = z.object({
  status: z.string().optional(),
  planId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const updateSubscriptionBodySchema = z.object({
  planId: z.string().optional(),
  status: z.string().optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export class AdminRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createAdminRoute();
    const {
      getDashboardMetrics,
      getBillingMetrics,
      listUsers,
      getUserDetails,
      getUserDetail,
      grantTrialSubscription,
      markUserInvoicePaid,
      updateUserRole,
      listSubscriptions,
      getSubscriptionDetails,
      updateSubscription,
      markInvoicePaid,
      cancelInvoice,
      deleteInvoice,
      createManualInvoice,
      listOasyfyWebhooks,
      listStripeWebhooks,
      getBillingSettings,
      updateBillingSettings,
      createPixSmokeTest,
      getPixSmokeTest,
      getOasyfyConnectionDiagnostics,
      sendOtpTestEmail,
    } = this.container.useCases.admin;

    route.get("/admin/dashboard/metrics", async () => {
      const metrics = await getDashboardMetrics.execute();
      return this.successResponse("OK", metrics, 200);
    });

    route.get("/admin/dashboard/billing-metrics", async (context) => {
      const query = adminBillingMetricsQuerySchema.parse(context.query);
      const metrics = await getBillingMetrics.execute({
        from: query.from,
        to: query.to,
      });
      return this.successResponse("OK", metrics, 200);
    });

    route.get("/admin/billing/settings", async () => {
      const settings = await getBillingSettings.execute();
      return this.successResponse("OK", settings, 200);
    });

    route.patch("/admin/billing/settings", async (context) => {
      const body = updateBillingSettingsBodySchema.parse(context.body);
      const settings = await updateBillingSettings.execute(body);
      return this.successResponse("Configurações atualizadas", settings, 200);
    });

    route.get("/admin/billing/oasyfy-connection", async () => {
      const diagnostics = getOasyfyConnectionDiagnostics.execute();
      return this.successResponse("OK", diagnostics, 200);
    });

    route.post("/admin/billing/pix-test", async (context) => {
      const { authUserId } = getAuthContext(context);
      const body = createPixSmokeTestBodySchema.parse(context.body);
      const result = await createPixSmokeTest.execute({
        userId: authUserId!,
        client: body.client,
      });
      return this.successResponse("Teste PIX iniciado", result, 201);
    });

    route.get("/admin/billing/pix-test/:id", async (context) => {
      const { id } = context.params;
      const result = await getPixSmokeTest.execute(id);
      return this.successResponse("OK", result, 200);
    });

    route.post("/admin/email/otp-test", async (context) => {
      const body = sendAdminOtpTestEmailBodySchema.parse(context.body);
      const result = await sendOtpTestEmail.execute(body);
      return this.successResponse("E-mail de teste enviado", result, 201);
    });

    route.get("/admin/subscriptions", async (context) => {
      const query = listSubscriptionsQuerySchema.parse(context.query);
      const result = await listSubscriptions.execute(query);
      return this.successResponse("OK", result, 200);
    });

    route.get("/admin/subscriptions/:id", async (context) => {
      const { id } = context.params;
      const result = await getSubscriptionDetails.execute(id);
      return this.successResponse("OK", result, 200);
    });

    route.patch("/admin/subscriptions/:id", async (context) => {
      const { id } = context.params;
      const body = updateSubscriptionBodySchema.parse(context.body);
      const subscription = await updateSubscription.execute(id, {
        ...body,
        status: body.status as SubscriptionStatusEnum | undefined,
      });
      return this.successResponse("Assinatura atualizada", subscription, 200);
    });

    route.post("/admin/subscriptions/:id/invoices", async (context) => {
      const { id } = context.params;
      const body = adminCreateManualInvoiceBodySchema.parse(context.body);
      const invoice = await createManualInvoice.execute(id, {
        ...body,
        type: body.type as SubscriptionInvoiceTypeEnum | undefined,
      });
      return this.successResponse("Fatura criada", invoice, 201);
    });

    route.patch(
      "/admin/subscriptions/:id/invoices/:invoiceId",
      async (context) => {
        const { invoiceId } = context.params;
        const body = adminUpdateInvoiceBodySchema.parse(context.body ?? {});

        if (body.action === "cancel") {
          const invoice = await cancelInvoice.execute(invoiceId);
          return this.successResponse("Fatura cancelada", invoice, 200);
        }

        const { authUserId } = getAuthContext(context);
        const invoice = await markInvoicePaid.execute(invoiceId, {
          adminUserId: authUserId!,
          reason: body.reason,
        });
        return this.successResponse("Fatura marcada como paga", invoice, 200);
      },
    );

    route.delete(
      "/admin/subscriptions/:id/invoices/:invoiceId",
      async (context) => {
        const { invoiceId } = context.params;
        await deleteInvoice.execute({ invoiceId });
        return this.successResponse("Fatura excluída", null, 200);
      },
    );

    route.get("/admin/billing/oasyfy-webhooks", async (context) => {
      const query = z
        .object({
          event: z.string().optional(),
          token: z.string().optional(),
          receivedFrom: z.coerce.date().optional(),
          receivedTo: z.coerce.date().optional(),
          page: z.coerce.number().int().positive().optional(),
          limit: z.coerce.number().int().positive().max(100).optional(),
        })
        .parse(context.query);
      const result = await listOasyfyWebhooks.execute(query);
      return this.successResponse("OK", result, 200);
    });

    route.get("/admin/billing/stripe-webhooks", async (context) => {
      const query = z
        .object({
          eventType: z.string().optional(),
          page: z.coerce.number().int().positive().optional(),
          limit: z.coerce.number().int().positive().max(100).optional(),
        })
        .parse(context.query);
      const result = await listStripeWebhooks.execute(query);
      return this.successResponse("OK", result, 200);
    });

    route.get("/admin/users", async (context) => {
      const query = listUsersQuerySchema.parse(context.query);
      const result = await listUsers.execute(query);
      return this.successResponse("OK", result, 200);
    });

    route.get("/admin/users/:userId", async (context) => {
      const { userId } = context.params;
      const user = await getUserDetails.execute(userId);
      return this.successResponse("OK", user, 200);
    });

    route.get("/admin/users/:userId/details", async (context) => {
      const { userId } = context.params;
      const detail = await getUserDetail.execute(userId);
      return this.successResponse("OK", detail, 200);
    });

    route.post("/admin/users/:userId/subscription/trial", async (context) => {
      const { userId } = context.params;
      const { authUserId } = getAuthContext(context);
      const body = grantTrialSubscriptionBodySchema.parse(context.body);
      const subscription = await grantTrialSubscription.execute({
        userId,
        planId: body.planId,
        grantedByUserId: authUserId!,
      });
      return this.successResponse("Trial ativado", subscription, 201);
    });

    route.patch("/admin/users/:userId/invoices/:invoiceId", async (context) => {
      const { userId, invoiceId } = context.params;
      const { authUserId } = getAuthContext(context);
      const body = adminUpdateInvoiceBodySchema.parse(context.body ?? {});

      if (body.action === "cancel") {
        throw new AppError("Cancelamento não suportado nesta rota", 400, "invalid_action");
      }

      const invoice = await markUserInvoicePaid.execute({
        userId,
        invoiceId,
        adminUserId: authUserId!,
        reason: body.reason,
      });

      return this.successResponse("Fatura marcada como paga", invoice, 200);
    });

    route.delete("/admin/users/:userId/invoices/:invoiceId", async (context) => {
      const { userId, invoiceId } = context.params;
      await deleteInvoice.execute({ invoiceId, userId });
      return this.successResponse("Fatura excluída", null, 200);
    });

    route.patch("/admin/users/:userId/role", async (context) => {
      const { userId } = context.params;
      const { role } = updateRoleBodySchema.parse(context.body);
      const { authUserId } = getAuthContext(context);

      const user = await updateUserRole.execute({
        userId,
        role,
        actorUserId: authUserId!,
      });

      return this.successResponse("Papel atualizado", user, 200);
    });

    return route;
  }
}

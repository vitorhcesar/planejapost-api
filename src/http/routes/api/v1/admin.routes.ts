import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { getAuthContext } from "@/http/client";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import { SubscriptionStatusEnum } from "@/domain/enums/subscription.enum";
import { adminBillingMetricsQuerySchema } from "@/http/validation/schemas/admin-billing-metrics.schema";
import { updateBillingSettingsBodySchema } from "@/http/validation/schemas/subscription.schema";
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
  currentPeriodEnd: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
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
      updateUserRole,
      listSubscriptions,
      getSubscriptionDetails,
      updateSubscription,
      markInvoicePaid,
      listOasyfyWebhooks,
      listStripeWebhooks,
      getBillingSettings,
      updateBillingSettings,
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

    route.patch(
      "/admin/subscriptions/:id/invoices/:invoiceId",
      async (context) => {
        const { invoiceId } = context.params;
        const invoice = await markInvoicePaid.execute(invoiceId);
        return this.successResponse("Fatura marcada como paga", invoice, 200);
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

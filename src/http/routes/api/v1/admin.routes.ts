import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { getAuthContext } from "@/http/client";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import { OmegaPayWebhookEventEnum } from "@/domain/enums/omegapay.enum";
import { adminBillingMetricsQuerySchema } from "@/http/validation/schemas/admin-billing-metrics.schema";
import { adminCreditWalletBodySchema } from "@/http/validation/schemas/wallet.schema";
import { z } from "zod";

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const updateRoleBodySchema = z.object({
  role: z.enum([AppRoleEnum.CLIENT, AppRoleEnum.ADMIN]),
});

const listOmegaPayWebhooksQuerySchema = z.object({
  event: z.nativeEnum(OmegaPayWebhookEventEnum).optional(),
  token: z.string().optional(),
  receivedFrom: z.coerce.date().optional(),
  receivedTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
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
      listOmegaPayWebhooks,
      getOmegaPayWebhookDetails,
    } = this.container.useCases.admin;
    const { adminCredit } = this.container.useCases.wallet;

    route.get("/admin/dashboard/metrics", async () => {
      const metrics = await getDashboardMetrics.execute();
      return this.successResponse("OK", metrics, 200);
    });

    route.get("/admin/dashboard/billing-metrics", async (context) => {
      const query = adminBillingMetricsQuerySchema.parse(context.query);
      const metrics = await getBillingMetrics.execute(query);
      return this.successResponse("OK", metrics, 200);
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

    route.post("/admin/users/:userId/wallet/credit", async (context) => {
      const { userId } = context.params;
      const body = adminCreditWalletBodySchema.parse(context.body);
      const { authUserId } = getAuthContext(context);

      const wallet = await adminCredit.execute({
        userId,
        amount: body.amount,
        description: body.description,
        actorUserId: authUserId!,
      });

      return this.successResponse("Saldo creditado", wallet, 200);
    });

    route.get("/admin/omegapay/webhooks", async (context) => {
      const query = listOmegaPayWebhooksQuerySchema.parse(context.query);
      const result = await listOmegaPayWebhooks.execute(query);
      return this.successResponse("OK", result, 200);
    });

    route.get("/admin/omegapay/webhooks/:webhookId", async (context) => {
      const { webhookId } = context.params;
      const webhook = await getOmegaPayWebhookDetails.execute(webhookId);
      return this.successResponse("OK", webhook, 200);
    });

    return route;
  }
}

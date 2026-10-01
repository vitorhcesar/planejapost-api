import type { ISubscriptionPlanFeatures } from "@/domain/constants/subscription-plan-features.util";
import type {
  ISubscriptionPlan,
  ISubscriptionPlanRepository,
} from "@/domain/repositories/subscription-plan.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import type { Prisma } from "../../../../../generated/prisma";

function mapPlan(row: {
  id: string;
  name: string;
  priceMonthlyBrl: Prisma.Decimal;
  connectionsLimit: number;
  postsPerMonthLimit: number;
  features: Prisma.JsonValue;
  stripePriceId: string | null;
  sortOrder: number;
  isActive: boolean;
}): ISubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    priceMonthlyBrl: Number(row.priceMonthlyBrl),
    connectionsLimit: row.connectionsLimit,
    postsPerMonthLimit: row.postsPerMonthLimit,
    features: row.features as unknown as ISubscriptionPlanFeatures,
    stripePriceId: row.stripePriceId,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export class PrismaSubscriptionPlanRepository
  extends BasePrismaRepository
  implements ISubscriptionPlanRepository
{
  async findAllActive(): Promise<ISubscriptionPlan[]> {
    const rows = await this.getPrismaClient().subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return rows.map(mapPlan);
  }

  async findById(id: string): Promise<ISubscriptionPlan | null> {
    const row = await this.getPrismaClient().subscriptionPlan.findUnique({
      where: { id },
    });

    return row ? mapPlan(row) : null;
  }
}

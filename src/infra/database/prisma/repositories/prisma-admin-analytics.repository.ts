import { PublicationTypeEnum } from "@/domain/enums/publication.enum";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  SubscriptionStatusEnum,
} from "@/domain/enums/subscription.enum";
import type {
  IAdminAnalyticsRepository,
  IAdminOverviewMetrics,
  IAdminPeriodDailyGrowth,
  IAdminPeriodMetrics,
  IPlanDistributionItem,
} from "@/domain/repositories/admin-analytics.repository";
import { estimateZernioCost } from "@/domain/utils/zernio-pricing.util";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eachDayInRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    days.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export class PrismaAdminAnalyticsRepository
  extends BasePrismaRepository
  implements IAdminAnalyticsRepository
{
  async getOverviewMetrics(): Promise<IAdminOverviewMetrics> {
    const prisma = this.getPrismaClient();

    const [
      totalUsers,
      connectedAccounts,
      totalPosts,
      totalStories,
      activeSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,
      planGroups,
      connectedAccountRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.socialConnectedAccount.count({
        where: { status: SocialAccountStatusEnum.CONNECTED },
      }),
      prisma.publication.count({
        where: { type: PublicationTypeEnum.POST },
      }),
      prisma.publication.count({
        where: { type: PublicationTypeEnum.STORY },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatusEnum.ACTIVE },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatusEnum.PAST_DUE },
      }),
      prisma.subscription.count({
        where: { status: SubscriptionStatusEnum.CANCELED },
      }),
      prisma.subscription.groupBy({
        by: ["planId"],
        where: {
          status: {
            in: Array.from(ACTIVE_SUBSCRIPTION_STATUSES),
          },
        },
        _count: { _all: true },
      }),
      prisma.socialConnectedAccount.findMany({
        where: { status: SocialAccountStatusEnum.CONNECTED },
        select: { connectedAt: true },
      }),
    ]);

    const planIds = planGroups.map((group) => group.planId);
    const plans = planIds.length
      ? await prisma.subscriptionPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, priceMonthlyBrl: true },
        })
      : [];

    const planById = new Map(plans.map((plan) => [plan.id, plan]));

    const planDistribution: IPlanDistributionItem[] = planGroups
      .map((group) => {
        const plan = planById.get(group.planId);

        return {
          planId: group.planId,
          planName: plan?.name ?? group.planId,
          count: group._count._all,
        };
      })
      .sort((left, right) => right.count - left.count);

    const mostPopularPlan = planDistribution[0] ?? null;

    const mrr = plans.reduce((total, plan) => {
      const group = planGroups.find((item) => item.planId === plan.id);

      if (!group) {
        return total;
      }

      return total + Number(plan.priceMonthlyBrl) * group._count._all;
    }, 0);

    const zernio = estimateZernioCost(
      connectedAccountRows.map((account) => ({
        connectedAt: account.connectedAt,
      })),
    );

    return {
      mrr,
      activeSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,
      mostPopularPlan,
      planDistribution,
      zernio,
      totalUsers,
      connectedAccounts,
      totalPosts,
      totalStories,
    };
  }

  async getPeriodMetrics(from: Date, to: Date): Promise<IAdminPeriodMetrics> {
    const prisma = this.getPrismaClient();

    const rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(to);
    rangeEnd.setHours(23, 59, 59, 999);

    const [newUsersRows, newSubscriptionsRows, newConnectionsRows, canceledSubscriptions] =
      await Promise.all([
        prisma.user.findMany({
          where: {
            createdAt: { gte: rangeStart, lte: rangeEnd },
          },
          select: { createdAt: true },
        }),
        prisma.subscription.findMany({
          where: {
            createdAt: { gte: rangeStart, lte: rangeEnd },
          },
          select: { createdAt: true },
        }),
        prisma.socialConnectedAccount.findMany({
          where: {
            connectedAt: { gte: rangeStart, lte: rangeEnd },
          },
          select: { connectedAt: true },
        }),
        prisma.subscription.count({
          where: {
            status: SubscriptionStatusEnum.CANCELED,
            updatedAt: { gte: rangeStart, lte: rangeEnd },
          },
        }),
      ]);

    const dailyMap = new Map<string, IAdminPeriodDailyGrowth>();

    for (const day of eachDayInRange(rangeStart, rangeEnd)) {
      dailyMap.set(day, {
        date: day,
        newUsers: 0,
        newSubscriptions: 0,
        newConnections: 0,
      });
    }

    for (const user of newUsersRows) {
      const day = dailyMap.get(formatDateKey(user.createdAt));

      if (day) {
        day.newUsers += 1;
      }
    }

    for (const subscription of newSubscriptionsRows) {
      const day = dailyMap.get(formatDateKey(subscription.createdAt));

      if (day) {
        day.newSubscriptions += 1;
      }
    }

    for (const connection of newConnectionsRows) {
      const day = dailyMap.get(formatDateKey(connection.connectedAt));

      if (day) {
        day.newConnections += 1;
      }
    }

    return {
      newUsers: newUsersRows.length,
      newSubscriptions: newSubscriptionsRows.length,
      newConnections: newConnectionsRows.length,
      canceledSubscriptions,
      dailyGrowth: Array.from(dailyMap.values()),
    };
  }
}

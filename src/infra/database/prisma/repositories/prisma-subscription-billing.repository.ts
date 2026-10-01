import { SubscriptionInvoiceStatusEnum } from "@/domain/enums/subscription.enum";
import type {
  ISubscriptionBillingDailyMetric,
  ISubscriptionBillingMetrics,
  ISubscriptionBillingRepository,
} from "@/domain/repositories/subscription-billing.repository";
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

export class PrismaSubscriptionBillingRepository
  extends BasePrismaRepository
  implements ISubscriptionBillingRepository
{
  async getMetrics(from: Date, to: Date): Promise<ISubscriptionBillingMetrics> {
    const rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(to);
    rangeEnd.setHours(23, 59, 59, 999);

    const [createdInvoices, paidInvoices, pendingInvoices] = await Promise.all([
      this.getPrismaClient().subscriptionInvoice.findMany({
        where: {
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          createdAt: true,
          status: true,
        },
      }),
      this.getPrismaClient().subscriptionInvoice.findMany({
        where: {
          status: SubscriptionInvoiceStatusEnum.PAID,
          paidAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          amount: true,
          paymentMethod: true,
          paidAt: true,
        },
      }),
      this.getPrismaClient().subscriptionInvoice.count({
        where: {
          status: {
            in: [
              SubscriptionInvoiceStatusEnum.OPEN,
              SubscriptionInvoiceStatusEnum.PENDING,
            ],
          },
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
      }),
    ]);

    const dailyMap = new Map<string, ISubscriptionBillingDailyMetric>();

    for (const day of eachDayInRange(rangeStart, rangeEnd)) {
      dailyMap.set(day, {
        date: day,
        pixRevenue: 0,
        cardRevenue: 0,
        totalRevenue: 0,
        invoicesCreated: 0,
        invoicesPaid: 0,
      });
    }

    for (const invoice of createdInvoices) {
      const key = formatDateKey(invoice.createdAt);
      const day = dailyMap.get(key);

      if (day) {
        day.invoicesCreated += 1;
      }
    }

    let totalPixRevenue = 0;
    let totalCardRevenue = 0;

    for (const invoice of paidInvoices) {
      if (!invoice.paidAt) {
        continue;
      }

      const amount = Number(invoice.amount);
      const key = formatDateKey(invoice.paidAt);
      const day = dailyMap.get(key);

      if (invoice.paymentMethod === "pix") {
        totalPixRevenue += amount;

        if (day) {
          day.pixRevenue += amount;
        }
      } else if (invoice.paymentMethod === "card") {
        totalCardRevenue += amount;

        if (day) {
          day.cardRevenue += amount;
        }
      }

      if (day) {
        day.totalRevenue += amount;
        day.invoicesPaid += 1;
      }
    }

    const dailyBreakdown = Array.from(dailyMap.values());

    return {
      from: formatDateKey(rangeStart),
      to: formatDateKey(rangeEnd),
      totalPixRevenue,
      totalCardRevenue,
      totalRevenue: totalPixRevenue + totalCardRevenue,
      invoicesCreated: createdInvoices.length,
      invoicesPaid: paidInvoices.length,
      pendingInvoices,
      dailyBreakdown,
    };
  }
}

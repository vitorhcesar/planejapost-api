import type { Prisma } from "../../../../../generated/prisma";
import type {
  IStripeWebhookEvent,
  IStripeWebhookRepository,
} from "@/domain/repositories/stripe-webhook.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaStripeWebhookRepository
  extends BasePrismaRepository
  implements IStripeWebhookRepository
{
  async save(input: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<IStripeWebhookEvent> {
    const row = await this.getPrismaClient().stripeWebhookEvent.create({
      data: {
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });

    return {
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      payload: row.payload as Record<string, unknown>,
      receivedAt: row.receivedAt,
    };
  }

  async list(filters: {
    eventType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: IStripeWebhookEvent[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = {
      ...(filters.eventType ? { eventType: filters.eventType } : {}),
    };

    const [rows, total] = await Promise.all([
      this.getPrismaClient().stripeWebhookEvent.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.getPrismaClient().stripeWebhookEvent.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        eventType: row.eventType,
        payload: row.payload as Record<string, unknown>,
        receivedAt: row.receivedAt,
      })),
      total,
    };
  }

  async findByEventId(eventId: string): Promise<IStripeWebhookEvent | null> {
    const row = await this.getPrismaClient().stripeWebhookEvent.findUnique({
      where: { eventId },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      payload: row.payload as Record<string, unknown>,
      receivedAt: row.receivedAt,
    };
  }
}

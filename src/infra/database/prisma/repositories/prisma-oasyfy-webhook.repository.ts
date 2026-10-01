import type { Prisma } from "../../../../../generated/prisma";
import type {
  IOasyfyWebhookPayload,
  IOasyfyWebhookReceipt,
} from "@/domain/acquirer/oasyfy-webhook";
import type { IOasyfyWebhookRepository } from "@/domain/repositories/oasyfy-webhook.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaOasyfyWebhookRepository
  extends BasePrismaRepository
  implements IOasyfyWebhookRepository
{
  async save(payload: IOasyfyWebhookPayload): Promise<IOasyfyWebhookReceipt> {
    const row = await this.getPrismaClient().oasyfyWebhookEvent.create({
      data: {
        event: payload.event,
        token: payload.token,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: row.id,
      event: row.event,
      token: row.token,
      receivedAt: row.receivedAt,
    };
  }

  async list(filters: {
    event?: string;
    token?: string;
    receivedFrom?: Date;
    receivedTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: IOasyfyWebhookReceipt[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = {
      ...(filters.event ? { event: filters.event } : {}),
      ...(filters.token
        ? {
            token: {
              contains: filters.token,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...((filters.receivedFrom || filters.receivedTo) && {
        receivedAt: {
          ...(filters.receivedFrom ? { gte: filters.receivedFrom } : {}),
          ...(filters.receivedTo ? { lte: filters.receivedTo } : {}),
        },
      }),
    };

    const [rows, total] = await Promise.all([
      this.getPrismaClient().oasyfyWebhookEvent.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.getPrismaClient().oasyfyWebhookEvent.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        event: row.event,
        token: row.token,
        receivedAt: row.receivedAt,
      })),
      total,
    };
  }

  async findById(id: string): Promise<IOasyfyWebhookReceipt | null> {
    const row = await this.getPrismaClient().oasyfyWebhookEvent.findUnique({
      where: { id },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      event: row.event,
      token: row.token,
      receivedAt: row.receivedAt,
    };
  }
}

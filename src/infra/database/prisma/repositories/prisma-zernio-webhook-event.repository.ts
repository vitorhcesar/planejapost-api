import type {
  IZernioWebhookEventRecord,
  IZernioWebhookEventRepository,
} from "@/domain/repositories/zernio-webhook-event.repository";
import type { Prisma } from "../../../../../generated/prisma";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

export class PrismaZernioWebhookEventRepository
  extends BasePrismaRepository
  implements IZernioWebhookEventRepository
{
  async findByEventId(eventId: string): Promise<IZernioWebhookEventRecord | null> {
    const row = await this.getPrismaClient().zernioWebhookEvent.findUnique({
      where: { eventId },
    });

    return row ? this.mapRow(row) : null;
  }

  async create(input: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<IZernioWebhookEventRecord> {
    const row = await this.getPrismaClient().zernioWebhookEvent.create({
      data: {
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });

    return this.mapRow(row);
  }

  async markAsProcessed(id: string): Promise<void> {
    await this.getPrismaClient().zernioWebhookEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  private mapRow(row: {
    id: string;
    eventId: string;
    eventType: string;
    payload: unknown;
    processedAt: Date | null;
    createdAt: Date;
  }): IZernioWebhookEventRecord {
    return {
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      payload:
        row.payload && typeof row.payload === "object"
          ? (row.payload as Record<string, unknown>)
          : {},
      processedAt: row.processedAt,
      createdAt: row.createdAt,
    };
  }
}

import type {
  IBillingSettings,
  IBillingSettingsRepository,
  IUpdateBillingSettingsInput,
} from "@/domain/repositories/billing-settings.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

function mapRow(row: {
  id: string;
  pixPaymentsEnabled: boolean;
  cardPaymentsEnabled: boolean;
  gracePeriodDays: number;
  renewalReminderDays: number[];
  invoiceGenerationLeadDays: number;
  updatedAt: Date;
}): IBillingSettings {
  return {
    id: row.id,
    pixPaymentsEnabled: row.pixPaymentsEnabled,
    cardPaymentsEnabled: row.cardPaymentsEnabled,
    gracePeriodDays: row.gracePeriodDays,
    renewalReminderDays: row.renewalReminderDays,
    invoiceGenerationLeadDays: row.invoiceGenerationLeadDays,
    updatedAt: row.updatedAt,
  };
}

export class PrismaBillingSettingsRepository
  extends BasePrismaRepository
  implements IBillingSettingsRepository
{
  async getOrCreate(): Promise<IBillingSettings> {
    const row = await this.getPrismaClient().billingSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        pixPaymentsEnabled: true,
        cardPaymentsEnabled: false,
        gracePeriodDays: 3,
        renewalReminderDays: [7, 3],
        invoiceGenerationLeadDays: 7,
      },
      update: {},
    });

    return mapRow(row);
  }

  async update(input: IUpdateBillingSettingsInput): Promise<IBillingSettings> {
    const row = await this.getPrismaClient().billingSettings.update({
      where: { id: "default" },
      data: input,
    });

    return mapRow(row);
  }
}

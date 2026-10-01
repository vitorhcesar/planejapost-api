export interface IBillingSettings {
  id: string;
  pixPaymentsEnabled: boolean;
  cardPaymentsEnabled: boolean;
  gracePeriodDays: number;
  renewalReminderDays: number[];
  invoiceGenerationLeadDays: number;
  updatedAt: Date;
}

export interface IUpdateBillingSettingsInput {
  pixPaymentsEnabled?: boolean;
  cardPaymentsEnabled?: boolean;
  gracePeriodDays?: number;
  renewalReminderDays?: number[];
  invoiceGenerationLeadDays?: number;
}

export interface IBillingSettingsRepository {
  getOrCreate(): Promise<IBillingSettings>;
  update(input: IUpdateBillingSettingsInput): Promise<IBillingSettings>;
}

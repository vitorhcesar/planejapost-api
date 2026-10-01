import type { ILogger } from "@/domain/services/logger.service";

const SCHEDULER_SCOPE = "SubscriptionScheduler";
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ISubscriptionSchedulerJobs {
  generateRenewalInvoices: { execute(): Promise<void> };
  sendRenewalReminders: { execute(): Promise<void> };
  processOverdue: { execute(): Promise<void> };
  processScheduledCancellations: { execute(): Promise<void> };
  expireUnpaidPixInvoices: { execute(): Promise<void> };
}

export class SubscriptionSchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly jobs: ISubscriptionSchedulerJobs,
    private readonly logger: ILogger,
  ) {}

  start(): void {
    void this.runAll();

    this.intervalId = setInterval(() => {
      void this.runAll();
    }, DAILY_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runAll(): Promise<void> {
    try {
      await this.jobs.generateRenewalInvoices.execute();
      await this.jobs.sendRenewalReminders.execute();
      await this.jobs.processOverdue.execute();
      await this.jobs.processScheduledCancellations.execute();
      await this.jobs.expireUnpaidPixInvoices.execute();
    } catch (error) {
      this.logger.error(SCHEDULER_SCOPE, "Falha ao executar jobs de assinatura", error);
    }
  }
}

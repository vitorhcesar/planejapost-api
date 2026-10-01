import { ProcessOasyfyPixSmokeTestPaymentUseCase } from "@/app/usecases/admin/oasyfy-pix-test.usecases";
import { ProcessSubscriptionInvoicePaymentUseCase } from "@/app/usecases/subscription/subscription.usecases";
import { OASYFY_PIX_TEST_METADATA_TYPE } from "@/domain/constants/oasyfy-pix-test.constant";
import type { IOasyfyWebhookPayload, IOasyfyWebhookReceipt } from "@/domain/acquirer/oasyfy-webhook";
import { OmegaPayWebhookEventEnum } from "@/domain/enums/omegapay.enum";
import type { IOasyfyPixTestRepository } from "@/domain/repositories/oasyfy-pix-test.repository";
import type { IOasyfyWebhookRepository } from "@/domain/repositories/oasyfy-webhook.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import type { ILogger } from "@/domain/services/logger.service";

const OASYFY_WEBHOOK_SCOPE = "Oasyfy Webhook";

export class ReceiveOasyfyWebhookUseCase {
  constructor(
    private readonly oasyfyWebhookRepository: IOasyfyWebhookRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly oasyfyPixTestRepository: IOasyfyPixTestRepository,
    private readonly processInvoicePaymentUseCase: ProcessSubscriptionInvoicePaymentUseCase,
    private readonly processPixSmokeTestPaymentUseCase: ProcessOasyfyPixSmokeTestPaymentUseCase,
    private readonly logger: ILogger,
  ) {}

  async execute(payload: IOasyfyWebhookPayload): Promise<IOasyfyWebhookReceipt> {
    const receipt = await this.oasyfyWebhookRepository.save(payload);

    const transactionId =
      typeof payload.transaction?.id === "string"
        ? payload.transaction.id
        : undefined;

    this.logger.info(OASYFY_WEBHOOK_SCOPE, "Webhook recebido", {
      webhookId: receipt.id,
      evento: receipt.event,
      transactionId,
    });

    if (payload.event !== OmegaPayWebhookEventEnum.TRANSACTION_PAID || !transactionId) {
      return receipt;
    }

    try {
      const pixTestPayment =
        await this.oasyfyPixTestRepository.findByOasyfyTransactionId(transactionId);
      const metadata = this.extractMetadata(payload);

      if (
        pixTestPayment ||
        metadata?.type === OASYFY_PIX_TEST_METADATA_TYPE
      ) {
        const testId =
          pixTestPayment?.id ??
          (typeof metadata?.pixTestId === "string" ? metadata.pixTestId : null);

        if (testId) {
          await this.processPixSmokeTestPaymentUseCase.execute({
            testId,
            webhookEventId: receipt.id,
          });

          this.logger.info(OASYFY_WEBHOOK_SCOPE, "Smoke test PIX confirmado", {
            testId,
            webhookId: receipt.id,
          });
        }

        return receipt;
      }

      const invoice =
        await this.subscriptionRepository.findInvoiceByOasyfyTransactionId(
          transactionId,
        );

      if (!invoice) {
        const invoiceId = metadata?.subscriptionInvoiceId;

        if (typeof invoiceId === "string") {
          await this.processInvoicePaymentUseCase.execute(invoiceId);
        }

        return receipt;
      }

      await this.processInvoicePaymentUseCase.execute(invoice.id);
    } catch (error) {
      this.logger.error(
        OASYFY_WEBHOOK_SCOPE,
        "Falha ao processar pagamento de assinatura",
        error,
        { webhookId: receipt.id },
      );
    }

    return receipt;
  }

  private extractMetadata(
    payload: IOasyfyWebhookPayload,
  ): Record<string, unknown> | null {
    const metadata = payload.transaction?.metadata;

    if (!metadata) {
      return null;
    }

    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    return metadata as Record<string, unknown>;
  }
}

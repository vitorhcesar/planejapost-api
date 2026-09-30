import type { IOmegaPayWebhookPayload, IOmegaPayWebhookReceipt } from "@/domain/acquirer/omegapay-webhook";
import type { IOmegaPayWebhookRepository } from "@/domain/repositories/omegapay-webhook.repository";
import type { ILogger } from "@/domain/services/logger.service";
import { ProcessWalletRechargeFromWebhookUseCase } from "@/app/usecases/wallet/process-wallet-recharge-from-webhook.usecase";

const OMEGAPAY_WEBHOOK_SCOPE = "OmegaPay Webhook";

export class ReceiveOmegaPayWebhookUseCase {
  constructor(
    private readonly omegaPayWebhookRepository: IOmegaPayWebhookRepository,
    private readonly processWalletRechargeFromWebhookUseCase: ProcessWalletRechargeFromWebhookUseCase,
    private readonly logger: ILogger,
  ) {}

  async execute(payload: IOmegaPayWebhookPayload): Promise<IOmegaPayWebhookReceipt> {
    const receipt = await this.omegaPayWebhookRepository.save(payload);

    const transactionId =
      typeof payload.transaction?.id === "string"
        ? payload.transaction.id
        : undefined;

    this.logger.info(OMEGAPAY_WEBHOOK_SCOPE, "Webhook recebido", {
      webhookId: receipt.id,
      evento: receipt.event,
      transactionId,
    });

    try {
      await this.processWalletRechargeFromWebhookUseCase.execute(payload);
    } catch (error) {
      this.logger.error(
        OMEGAPAY_WEBHOOK_SCOPE,
        "Falha ao processar recarga de carteira",
        error,
        {
          webhookId: receipt.id,
          evento: receipt.event,
        },
      );
    }

    return receipt;
  }
}

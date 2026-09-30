import type { IOmegaPayWebhookPayload } from "@/domain/acquirer/omegapay-webhook";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import type { ILogger } from "@/domain/services/logger.service";
import { OmegaPayWebhookEventEnum } from "@/domain/enums/omegapay.enum";
import {
  WalletRechargeStatusEnum,
  WalletTransactionTypeEnum,
} from "@/domain/enums/wallet.enum";

const WALLET_SCOPE = "Carteira";

export class ProcessWalletRechargeFromWebhookUseCase {
  constructor(
    private readonly walletRepository: IWalletRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(payload: IOmegaPayWebhookPayload): Promise<void> {
    const recharge = await this.resolveRecharge(payload);

    if (!recharge) {
      return;
    }

    if (payload.event === OmegaPayWebhookEventEnum.TRANSACTION_PAID) {
      await this.handlePaid(recharge.id, recharge.walletId, recharge.amount, payload);
      return;
    }

    if (
      payload.event === OmegaPayWebhookEventEnum.TRANSACTION_CANCELED ||
      payload.event === OmegaPayWebhookEventEnum.TRANSACTION_REFUNDED
    ) {
      if (recharge.status === WalletRechargeStatusEnum.PENDING) {
        await this.walletRepository.markRechargeCanceled(recharge.id);
      }
    }
  }

  private async handlePaid(
    rechargeId: string,
    walletId: string,
    amount: number,
    payload: IOmegaPayWebhookPayload,
  ): Promise<void> {
    const referenceKey = this.buildReferenceKey(payload, rechargeId);

    const alreadyCredited =
      await this.walletRepository.hasTransactionWithReferenceKey(referenceKey);

    if (alreadyCredited) {
      return;
    }

    const recharge = await this.walletRepository.findRechargeById(rechargeId);

    if (!recharge || recharge.status === WalletRechargeStatusEnum.PAID) {
      return;
    }

    await this.walletRepository.creditWallet({
      walletId,
      amount,
      type: WalletTransactionTypeEnum.CREDIT_PIX,
      description: "Recarga via PIX",
      referenceKey,
      metadata: {
        webhookEvent: payload.event,
        omegapayTransactionId: this.extractTransactionId(payload),
        identifier: recharge.identifier,
      },
    });

    await this.walletRepository.markRechargePaid(rechargeId);

    this.logger.info(WALLET_SCOPE, "Recarga creditada via webhook", {
        rechargeId,
        walletId,
        amount,
        referenceKey,
    });
  }

  private async resolveRecharge(payload: IOmegaPayWebhookPayload) {
    const identifier = this.extractIdentifier(payload);

    if (identifier) {
      const byIdentifier =
        await this.walletRepository.findRechargeByIdentifier(identifier);

      if (byIdentifier) {
        return byIdentifier;
      }
    }

    const transactionId = this.extractTransactionId(payload);

    if (transactionId) {
      return this.walletRepository.findRechargeByOmegaPayTransactionId(
        transactionId,
      );
    }

    const metadata = this.extractMetadata(payload);

    if (typeof metadata.rechargeId === "string") {
      return this.walletRepository.findRechargeById(metadata.rechargeId);
    }

    return null;
  }

  private extractIdentifier(payload: IOmegaPayWebhookPayload): string | undefined {
    const transaction = payload.transaction;

    if (transaction && typeof transaction.identifier === "string") {
      return transaction.identifier;
    }

    const metadata = this.extractMetadata(payload);

    if (typeof metadata.identifier === "string") {
      return metadata.identifier;
    }

    return undefined;
  }

  private extractTransactionId(payload: IOmegaPayWebhookPayload): string | undefined {
    const transaction = payload.transaction;

    if (transaction && typeof transaction.id === "string") {
      return transaction.id;
    }

    return undefined;
  }

  private extractMetadata(payload: IOmegaPayWebhookPayload): Record<string, unknown> {
    if (payload.metadata && typeof payload.metadata === "object") {
      return payload.metadata as Record<string, unknown>;
    }

    return {};
  }

  private buildReferenceKey(
    payload: IOmegaPayWebhookPayload,
    rechargeId: string,
  ): string {
    const transactionId = this.extractTransactionId(payload);

    if (transactionId) {
      return `pix:${transactionId}`;
    }

    return `pix:recharge:${rechargeId}`;
  }
}

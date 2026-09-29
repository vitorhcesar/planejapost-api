import { AppError } from "@/domain/errors/app.error";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import { WalletTransactionTypeEnum } from "@/domain/enums/wallet.enum";
import type { IWalletDto } from "@/app/usecases/wallet/dto/wallet.dto";

const MIN_ADMIN_CREDIT_AMOUNT = 0.01;

export interface IAdminCreditWalletInput {
  userId: string;
  amount: number;
  description?: string;
  actorUserId: string;
}

export class AdminCreditWalletUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(input: IAdminCreditWalletInput): Promise<IWalletDto> {
    if (input.amount < MIN_ADMIN_CREDIT_AMOUNT) {
      throw new AppError(
        "O valor deve ser maior que zero",
        400,
        "wallet_credit_invalid_amount",
      );
    }

    const wallet = await this.walletRepository.getOrCreateByUserId(input.userId);

    const updatedWallet = await this.walletRepository.creditWallet({
      walletId: wallet.id,
      amount: input.amount,
      type: WalletTransactionTypeEnum.CREDIT_ADMIN,
      description: input.description?.trim() || "Crédito manual pelo administrador",
      referenceKey: `admin:${input.actorUserId}:${Date.now()}:${crypto.randomUUID()}`,
      metadata: {
        actorUserId: input.actorUserId,
        targetUserId: input.userId,
      },
    });

    return {
      balance: updatedWallet.balance,
    };
  }
}

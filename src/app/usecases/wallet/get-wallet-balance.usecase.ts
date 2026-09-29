import { AppError } from "@/domain/errors/app.error";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import type { IWalletDto } from "@/app/usecases/wallet/dto/wallet.dto";

export class GetWalletBalanceUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(userId: string): Promise<IWalletDto> {
    const wallet = await this.walletRepository.getOrCreateByUserId(userId);

    return {
      balance: wallet.balance,
    };
  }
}

import { AppError } from "@/domain/errors/app.error";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import type { IOmegaPayService } from "@/domain/acquirer/omegapay.service";
import { WalletRechargeStatusEnum } from "@/domain/enums/wallet.enum";
import type { IWalletRechargeDto } from "@/app/usecases/wallet/dto/wallet.dto";

const MIN_RECHARGE_AMOUNT = 10;

export interface ICreateWalletPixRechargeInput {
  userId: string;
  amount: number;
  client: {
    phone: string;
    document: string;
  };
}

export class CreateWalletPixRechargeUseCase {
  constructor(
    private readonly walletRepository: IWalletRepository,
    private readonly userRepository: IUserRepository,
    private readonly omegaPayService: IOmegaPayService,
    private readonly publicApiConfig: IPublicApiConfig,
  ) {}

  async execute(input: ICreateWalletPixRechargeInput): Promise<IWalletRechargeDto> {
    if (input.amount < MIN_RECHARGE_AMOUNT) {
      throw new AppError(
        "O valor mínimo de recarga é R$ 10,00",
        400,
        "wallet_recharge_min_amount",
      );
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const wallet = await this.walletRepository.getOrCreateByUserId(input.userId);
    const recharge = await this.walletRepository.createRecharge({
      walletId: wallet.id,
      identifier: `wr_${crypto.randomUUID().replace(/-/g, "")}`,
      amount: input.amount,
    });

    const pixResult = await this.omegaPayService.receivePix({
      identifier: recharge.identifier,
      amount: input.amount,
      client: {
        name: user.name,
        email: user.email,
        phone: input.client.phone,
        document: input.client.document,
      },
      metadata: {
        type: "wallet_recharge",
        userId: input.userId,
        rechargeId: recharge.id,
        identifier: recharge.identifier,
      },
      callbackUrl: `${this.publicApiConfig.publicApiUrl}/api/v1/webhooks/omegapay`,
    });

    const updatedRecharge = await this.walletRepository.updateRechargeAfterPixCreation({
      rechargeId: recharge.id,
      omegapayTransactionId: pixResult.transactionId,
      pixCode: pixResult.pix.code,
      pixImageUrl: pixResult.pix.image,
    });

    return this.mapRechargeToDto(updatedRecharge);
  }

  async getRechargeForUser(
    userId: string,
    rechargeId: string,
  ): Promise<IWalletRechargeDto> {
    const wallet = await this.walletRepository.getOrCreateByUserId(userId);
    const recharge = await this.walletRepository.findRechargeById(rechargeId);

    if (!recharge || recharge.walletId !== wallet.id) {
      throw new AppError("Recarga não encontrada", 404, "wallet_recharge_not_found");
    }

    return this.mapRechargeToDto(recharge);
  }

  private mapRechargeToDto(recharge: {
    id: string;
    amount: number;
    status: WalletRechargeStatusEnum;
    identifier: string;
    omegapayTransactionId: string | null;
    pixCode: string | null;
    pixImageUrl: string | null;
    paidAt: Date | null;
    createdAt: Date;
  }): IWalletRechargeDto {
    return {
      id: recharge.id,
      amount: recharge.amount,
      status: recharge.status,
      identifier: recharge.identifier,
      omegapayTransactionId: recharge.omegapayTransactionId,
      pixCode: recharge.pixCode,
      pixImageUrl: recharge.pixImageUrl,
      paidAt: recharge.paidAt?.toISOString() ?? null,
      createdAt: recharge.createdAt.toISOString(),
    };
  }
}

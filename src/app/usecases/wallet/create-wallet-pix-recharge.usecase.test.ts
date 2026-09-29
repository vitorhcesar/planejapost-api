import { describe, expect, it } from "bun:test";
import { CreateWalletPixRechargeUseCase } from "@/app/usecases/wallet/create-wallet-pix-recharge.usecase";
import { User } from "@/domain/entities/user.entity";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import type {
  IOmegaPayReceivePixInput,
  IOmegaPayService,
} from "@/domain/acquirer/omegapay.service";
import { OmegaPayTransactionStatusEnum } from "@/domain/enums/omegapay.enum";
import { WalletRechargeStatusEnum } from "@/domain/enums/wallet.enum";
import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type {
  IWallet,
  IWalletRecharge,
  IWalletRepository,
} from "@/domain/repositories/wallet.repository";

class InMemoryUserRepository {
  users: User[] = [];

  async findById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail() {
    return null;
  }

  async save(user: User) {
    return user;
  }

  async delete() {}

  async countAll() {
    return this.users.length;
  }

  async listPaginated() {
    return { users: [], total: 0 };
  }
}

class InMemoryWalletRepository {
  wallet: IWallet = {
    id: "wallet-1",
    userId: "user-1",
    balance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  recharges: IWalletRecharge[] = [];

  async getOrCreateByUserId(userId: string) {
    return { ...this.wallet, userId };
  }

  async findByUserId() {
    return this.wallet;
  }

  async creditWallet() {
    return this.wallet;
  }

  async debitWallet() {
    return this.wallet;
  }

  async createRecharge(input: {
    walletId: string;
    identifier: string;
    amount: number;
  }) {
    const recharge: IWalletRecharge = {
      id: `recharge-${this.recharges.length + 1}`,
      walletId: input.walletId,
      identifier: input.identifier,
      amount: input.amount,
      status: WalletRechargeStatusEnum.PENDING,
      omegapayTransactionId: null,
      pixCode: null,
      pixImageUrl: null,
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.recharges.push(recharge);
    return recharge;
  }

  async updateRechargeAfterPixCreation(input: {
    rechargeId: string;
    omegapayTransactionId: string;
    pixCode: string;
    pixImageUrl?: string;
  }) {
    const recharge = this.recharges.find((item) => item.id === input.rechargeId);

    if (!recharge) {
      throw new Error("Recharge not found");
    }

    const updated = {
      ...recharge,
      omegapayTransactionId: input.omegapayTransactionId,
      pixCode: input.pixCode,
      pixImageUrl: input.pixImageUrl ?? null,
      updatedAt: new Date(),
    };

    this.recharges = this.recharges.map((item) =>
      item.id === updated.id ? updated : item,
    );

    return updated;
  }

  async findRechargeById(rechargeId: string) {
    return this.recharges.find((item) => item.id === rechargeId) ?? null;
  }

  async findRechargeByIdentifier() {
    return null;
  }

  async markRechargeAsPaid() {
    throw new Error("not implemented");
  }
}

class FakeOmegaPayService implements IOmegaPayService {
  lastCallbackUrl: string | null = null;

  async receivePix(input: IOmegaPayReceivePixInput) {
    this.lastCallbackUrl = input.callbackUrl ?? null;

    return {
      transactionId: "tx-1",
      status: OmegaPayTransactionStatusEnum.PENDING,
      fee: 0,
      order: { id: "order-1" },
      pix: { code: "pix-code" },
    };
  }
}

const publicApiConfig: IPublicApiConfig = {
  publicApiUrl: "https://api.example.com",
};

describe("CreateWalletPixRechargeUseCase", () => {
  it("rejects amounts below the minimum", async () => {
    const useCase = new CreateWalletPixRechargeUseCase(
      new InMemoryWalletRepository() as unknown as IWalletRepository,
      new InMemoryUserRepository() as unknown as IUserRepository,
      new FakeOmegaPayService(),
      publicApiConfig,
    );

    try {
      await useCase.execute({
        userId: "user-1",
        amount: 5,
        client: { phone: "11999999999", document: "12345678901" },
      });
      throw new Error("Expected recharge to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("wallet_recharge_min_amount");
    }
  });

  it("fails when the user does not exist", async () => {
    const useCase = new CreateWalletPixRechargeUseCase(
      new InMemoryWalletRepository() as unknown as IWalletRepository,
      new InMemoryUserRepository() as unknown as IUserRepository,
      new FakeOmegaPayService(),
      publicApiConfig,
    );

    try {
      await useCase.execute({
        userId: "missing",
        amount: 20,
        client: { phone: "11999999999", document: "12345678901" },
      });
      throw new Error("Expected recharge to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("user_not_found");
    }
  });

  it("creates a pix recharge with the webhook callback url", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.users = [
      User.restore({
        id: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
        emailVerified: true,
        image: null,
        role: "client" as never,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];

    const omegaPayService = new FakeOmegaPayService();
    const useCase = new CreateWalletPixRechargeUseCase(
      new InMemoryWalletRepository() as unknown as IWalletRepository,
      userRepository as unknown as IUserRepository,
      omegaPayService,
      publicApiConfig,
    );

    const result = await useCase.execute({
      userId: "user-1",
      amount: 20,
      client: { phone: "11999999999", document: "12345678901" },
    });

    expect(result.pixCode).toBe("pix-code");
    expect(omegaPayService.lastCallbackUrl).toBe(
      "https://api.example.com/api/v1/webhooks/omegapay",
    );
  });
});

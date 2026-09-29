import { describe, expect, it } from "bun:test";
import {
  PurchaseAccountSlotsUseCase,
  RenewAccountSlotUseCase,
} from "@/app/usecases/account-slot/account-slot.usecases";
import {
  AccountSlotStatusEnum,
  SLOT_PRICE_BRL,
} from "@/domain/enums/account-slot.enum";
import { WalletTransactionTypeEnum } from "@/domain/enums/wallet.enum";
import { AppError } from "@/domain/errors/app.error";
import type {
  IAccountSlot,
  IAccountSlotRepository,
  IAccountSlotWithAccount,
} from "@/domain/repositories/account-slot.repository";
import type {
  IWallet,
  IWalletRepository,
} from "@/domain/repositories/wallet.repository";

class InMemoryAccountSlotRepository implements IAccountSlotRepository {
  slots: IAccountSlotWithAccount[] = [];

  async findByIdAndUserId(id: string, userId: string) {
    return this.slots.find((slot) => slot.id === id && slot.userId === userId) ?? null;
  }

  async findByUserId(userId: string) {
    return this.slots.filter((slot) => slot.userId === userId);
  }

  async findByInstagramConnectedAccountId() {
    return null;
  }

  async createMany(userId: string, slots: Array<{ expiresAt: Date }>) {
    const created = slots.map((slot, index) => ({
      id: `slot-${this.slots.length + index + 1}`,
      userId,
      instagramConnectedAccountId: null,
      status: AccountSlotStatusEnum.ACTIVE,
      expiresAt: slot.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      instagramAccount: null,
    }));
    this.slots.push(...created);
    return created;
  }

  async assignAccount(slotId: string, accountId: string) {
    const slot = this.slots.find((item) => item.id === slotId);

    if (!slot) {
      throw new Error("Slot not found");
    }

    slot.instagramConnectedAccountId = accountId;
    return slot;
  }

  async releaseAccount() {}

  async renew(slotId: string, expiresAt: Date) {
    const slot = this.slots.find((item) => item.id === slotId);

    if (!slot) {
      throw new Error("Slot not found");
    }

    slot.expiresAt = expiresAt;
    slot.status = AccountSlotStatusEnum.ACTIVE;
    slot.updatedAt = new Date();

    return slot;
  }

  async expireOverdueSlots() {}
}

class InMemoryWalletRepository {
  wallet: IWallet = {
    id: "wallet-1",
    userId: "user-1",
    balance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  async getOrCreateByUserId(userId: string) {
    return { ...this.wallet, userId };
  }

  async findByUserId() {
    return this.wallet;
  }

  async creditWallet() {
    return this.wallet;
  }

  async debitWallet(input: { amount: number }) {
    if (this.wallet.balance < input.amount) {
      throw new AppError("Saldo insuficiente", 400, "wallet_insufficient_balance");
    }

    this.wallet = {
      ...this.wallet,
      balance: this.wallet.balance - input.amount,
    };

    return this.wallet;
  }

  async createRecharge() {
    throw new Error("not implemented");
  }

  async updateRechargeAfterPixCreation() {
    throw new Error("not implemented");
  }

  async findRechargeById() {
    return null;
  }

  async findRechargeByIdentifier() {
    return null;
  }

  async markRechargeAsPaid() {
    throw new Error("not implemented");
  }
}

describe("Account slot use cases", () => {
  it("blocks purchase when wallet balance is insufficient", async () => {
    const useCase = new PurchaseAccountSlotsUseCase(
      new InMemoryAccountSlotRepository(),
      new InMemoryWalletRepository() as unknown as IWalletRepository,
    );

    try {
      await useCase.execute({
        userId: "user-1",
        quantity: 1,
      });
      throw new Error("Expected purchase to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("wallet_insufficient_balance");
    }
  });

  it("renews an expired slot and debits the wallet", async () => {
    const accountSlotRepository = new InMemoryAccountSlotRepository();
    const walletRepository = new InMemoryWalletRepository();
    walletRepository.wallet.balance = SLOT_PRICE_BRL;

    accountSlotRepository.slots = [
      {
        id: "slot-1",
        userId: "user-1",
        instagramConnectedAccountId: null,
        status: AccountSlotStatusEnum.EXPIRED,
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
        instagramAccount: null,
      },
    ];

    const result = await new RenewAccountSlotUseCase(
      accountSlotRepository,
      walletRepository as unknown as IWalletRepository,
    ).execute("user-1", "slot-1");

    expect(result.totalCharged).toBe(SLOT_PRICE_BRL);
    expect(result.newBalance).toBe(0);
    expect(result.slot.status).toBe(AccountSlotStatusEnum.ACTIVE);
  });
});

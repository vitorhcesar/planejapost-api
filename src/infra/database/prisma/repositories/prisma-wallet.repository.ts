import { Prisma } from "../../../../../generated/prisma";
import type {
  ICreditWalletInput,
  IDebitWalletInput,
  IWallet,
  IWalletRecharge,
  IWalletRepository,
} from "@/domain/repositories/wallet.repository";
import { AppError } from "@/domain/errors/app.error";
import {
  WalletRechargeStatusEnum,
  WalletTransactionTypeEnum,
} from "@/domain/enums/wallet.enum";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function mapWallet(row: {
  id: string;
  userId: string;
  balance: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}): IWallet {
  return {
    id: row.id,
    userId: row.userId,
    balance: decimalToNumber(row.balance),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRecharge(row: {
  id: string;
  walletId: string;
  identifier: string;
  amount: Prisma.Decimal;
  status: string;
  omegapayTransactionId: string | null;
  pixCode: string | null;
  pixImageUrl: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IWalletRecharge {
  return {
    id: row.id,
    walletId: row.walletId,
    identifier: row.identifier,
    amount: decimalToNumber(row.amount),
    status: row.status as WalletRechargeStatusEnum,
    omegapayTransactionId: row.omegapayTransactionId,
    pixCode: row.pixCode,
    pixImageUrl: row.pixImageUrl,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaWalletRepository
  extends BasePrismaRepository
  implements IWalletRepository
{
  async getOrCreateByUserId(userId: string): Promise<IWallet> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return existing;
    }

    const row = await this.getPrismaClient().wallet.create({
      data: { userId },
    });

    return mapWallet(row);
  }

  async findByUserId(userId: string): Promise<IWallet | null> {
    const row = await this.getPrismaClient().wallet.findUnique({
      where: { userId },
    });

    return row ? mapWallet(row) : null;
  }

  async creditWallet(input: ICreditWalletInput): Promise<IWallet> {
    return this.getPrismaClient().$transaction(async (tx) => {
      if (input.referenceKey) {
        const existing = await tx.walletTransaction.findUnique({
          where: { referenceKey: input.referenceKey },
        });

        if (existing) {
          const wallet = await tx.wallet.findUniqueOrThrow({
            where: { id: input.walletId },
          });
          return mapWallet(wallet);
        }
      }

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { id: input.walletId },
      });

      const currentBalance = decimalToNumber(wallet.balance);
      const nextBalance = Number((currentBalance + input.amount).toFixed(2));

      const updatedWallet = await tx.wallet.update({
        where: { id: input.walletId },
        data: { balance: nextBalance },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: input.walletId,
          type: input.type,
          amount: input.amount,
          balanceAfter: nextBalance,
          description: input.description ?? null,
          referenceKey: input.referenceKey ?? null,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      return mapWallet(updatedWallet);
    });
  }

  async debitWallet(input: IDebitWalletInput): Promise<IWallet> {
    return this.getPrismaClient().$transaction(async (tx) => {
      if (input.referenceKey) {
        const existing = await tx.walletTransaction.findUnique({
          where: { referenceKey: input.referenceKey },
        });

        if (existing) {
          const wallet = await tx.wallet.findUniqueOrThrow({
            where: { id: input.walletId },
          });
          return mapWallet(wallet);
        }
      }

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { id: input.walletId },
      });

      const currentBalance = decimalToNumber(wallet.balance);

      if (currentBalance < input.amount) {
        throw new AppError(
          "Saldo insuficiente na carteira",
          400,
          "wallet_insufficient_balance",
        );
      }

      const nextBalance = Number((currentBalance - input.amount).toFixed(2));

      const updatedWallet = await tx.wallet.update({
        where: { id: input.walletId },
        data: { balance: nextBalance },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: input.walletId,
          type: input.type,
          amount: input.amount,
          balanceAfter: nextBalance,
          description: input.description ?? null,
          referenceKey: input.referenceKey ?? null,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      return mapWallet(updatedWallet);
    });
  }

  async createRecharge(input: {
    walletId: string;
    identifier: string;
    amount: number;
  }): Promise<IWalletRecharge> {
    const row = await this.getPrismaClient().walletRecharge.create({
      data: {
        walletId: input.walletId,
        identifier: input.identifier,
        amount: input.amount,
        status: WalletRechargeStatusEnum.PENDING,
      },
    });

    return mapRecharge(row);
  }

  async updateRechargeAfterPixCreation(input: {
    rechargeId: string;
    omegapayTransactionId: string;
    pixCode: string;
    pixImageUrl?: string;
  }): Promise<IWalletRecharge> {
    const row = await this.getPrismaClient().walletRecharge.update({
      where: { id: input.rechargeId },
      data: {
        omegapayTransactionId: input.omegapayTransactionId,
        pixCode: input.pixCode,
        pixImageUrl: input.pixImageUrl ?? null,
      },
    });

    return mapRecharge(row);
  }

  async findRechargeById(id: string): Promise<IWalletRecharge | null> {
    const row = await this.getPrismaClient().walletRecharge.findUnique({
      where: { id },
    });

    return row ? mapRecharge(row) : null;
  }

  async findRechargeByIdentifier(identifier: string): Promise<IWalletRecharge | null> {
    const row = await this.getPrismaClient().walletRecharge.findUnique({
      where: { identifier },
    });

    return row ? mapRecharge(row) : null;
  }

  async findRechargeByOmegaPayTransactionId(
    transactionId: string,
  ): Promise<IWalletRecharge | null> {
    const row = await this.getPrismaClient().walletRecharge.findFirst({
      where: { omegapayTransactionId: transactionId },
    });

    return row ? mapRecharge(row) : null;
  }

  async markRechargePaid(rechargeId: string): Promise<IWalletRecharge> {
    const row = await this.getPrismaClient().walletRecharge.update({
      where: { id: rechargeId },
      data: {
        status: WalletRechargeStatusEnum.PAID,
        paidAt: new Date(),
      },
    });

    return mapRecharge(row);
  }

  async markRechargeCanceled(rechargeId: string): Promise<IWalletRecharge> {
    const row = await this.getPrismaClient().walletRecharge.update({
      where: { id: rechargeId },
      data: { status: WalletRechargeStatusEnum.CANCELED },
    });

    return mapRecharge(row);
  }

  async hasTransactionWithReferenceKey(referenceKey: string): Promise<boolean> {
    const row = await this.getPrismaClient().walletTransaction.findUnique({
      where: { referenceKey },
      select: { id: true },
    });

    return Boolean(row);
  }
}

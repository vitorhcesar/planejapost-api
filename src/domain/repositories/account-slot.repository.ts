import type { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";

export interface IAccountSlot {
  id: string;
  userId: string;
  socialConnectedAccountId: string | null;
  status: AccountSlotStatusEnum;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountSlotWithAccount extends IAccountSlot {
  socialAccount: {
    id: string;
    platform: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: string;
    canPost: boolean;
    needsReconnect: boolean;
  } | null;
}

export interface IAccountSlotRepository {
  findByIdAndUserId(id: string, userId: string): Promise<IAccountSlot | null>;
  findByUserId(userId: string): Promise<IAccountSlotWithAccount[]>;
  findBySocialConnectedAccountId(
    accountId: string,
  ): Promise<IAccountSlot | null>;
  createMany(
    userId: string,
    slots: Array<{ expiresAt: Date }>,
  ): Promise<IAccountSlot[]>;
  assignAccount(slotId: string, accountId: string): Promise<IAccountSlot>;
  releaseAccount(accountId: string): Promise<void>;
  renew(slotId: string, expiresAt: Date): Promise<IAccountSlot>;
  expireOverdueSlots(userId: string): Promise<void>;
}

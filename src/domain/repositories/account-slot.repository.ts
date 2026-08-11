import type { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";

export interface IAccountSlot {
  id: string;
  userId: string;
  instagramConnectedAccountId: string | null;
  status: AccountSlotStatusEnum;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountSlotWithAccount extends IAccountSlot {
  instagramAccount: {
    id: string;
    username: string;
    displayName: string | null;
    profilePictureUrl: string | null;
    status: string;
    tokenExpiresAt: Date;
    integrationSource: "legacy_project_app" | "user_meta_app";
  } | null;
}

export interface IAccountSlotRepository {
  findByIdAndUserId(id: string, userId: string): Promise<IAccountSlot | null>;
  findByUserId(userId: string): Promise<IAccountSlotWithAccount[]>;
  findByInstagramConnectedAccountId(
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

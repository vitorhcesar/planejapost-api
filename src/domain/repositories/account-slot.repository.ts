import type { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";

export interface IAccountSlot {
  id: string;
  userId: string;
  socialConnectedAccountId: string | null;
  status: AccountSlotStatusEnum;
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
    workspaceId: string;
    workspaceName: string;
  } | null;
}

export interface IAccountSlotRepository {
  findByIdAndUserId(id: string, userId: string): Promise<IAccountSlot | null>;
  findByUserId(userId: string): Promise<IAccountSlotWithAccount[]>;
  findBySocialConnectedAccountId(
    accountId: string,
  ): Promise<IAccountSlot | null>;
  createMany(userId: string, slots: Array<Record<string, never>>): Promise<IAccountSlot[]>;
  assignAccount(slotId: string, accountId: string): Promise<IAccountSlot>;
  releaseAccount(accountId: string): Promise<void>;
  deactivate(slotId: string): Promise<void>;
  findAvailableSlot(userId: string): Promise<IAccountSlot | null>;
}

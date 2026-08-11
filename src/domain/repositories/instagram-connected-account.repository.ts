import type { InstagramConnectedAccount } from "@/domain/entities/instagram-connected-account.entity";

export interface IInstagramConnectedAccountRepository {
  findById(id: string): Promise<InstagramConnectedAccount | null>;
  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<InstagramConnectedAccount | null>;
  findByUserId(userId: string): Promise<InstagramConnectedAccount[]>;
  findByUserIdAndInstagramUserId(
    userId: string,
    instagramUserId: string,
  ): Promise<InstagramConnectedAccount | null>;
  findAllByInstagramUserId(
    instagramUserId: string,
  ): Promise<InstagramConnectedAccount[]>;
  findAllByInstagramUserIdAndMetaAppConfigId(
    instagramUserId: string,
    metaAppConfigId: string,
  ): Promise<InstagramConnectedAccount[]>;
  save(account: InstagramConnectedAccount): Promise<InstagramConnectedAccount>;
  countAll(): Promise<number>;
}

export interface IInstagramOAuthStateRepository {
  create(
    userId: string,
    state: string,
    expiresAt: Date,
    metaAppConfigId: string,
    accountSlotId?: string,
  ): Promise<void>;
  findValidState(
    state: string,
  ): Promise<{
    userId: string;
    accountSlotId: string | null;
    metaAppConfigId: string;
  } | null>;
  deleteByState(state: string): Promise<void>;
}

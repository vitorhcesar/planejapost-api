import type {
  IZernioAccount,
  IZernioAccountHealth,
} from "@/domain/zernio/zernio.types";

export interface IZernioAccountService {
  listAccounts(profileId: string): Promise<IZernioAccount[]>;
  disconnectAccount(accountId: string): Promise<void>;
  getAccountHealth(accountId: string): Promise<IZernioAccountHealth>;
}

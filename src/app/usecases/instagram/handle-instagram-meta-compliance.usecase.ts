import { randomBytes } from "node:crypto";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IInstagramConnectedAccountRepository } from "@/domain/repositories/instagram-connected-account.repository";

export interface IInstagramDataDeletionResult {
  confirmationCode: string;
  statusUrl: string;
}

export class HandleInstagramMetaComplianceUseCase {
  constructor(
    private readonly instagramConnectedAccountRepository: IInstagramConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly frontendOrigin: string,
  ) {}

  async deauthorizeByInstagramUserId(
    instagramUserId: string,
    metaAppConfigId: string,
  ): Promise<void> {
    await this.disconnectAllByInstagramUserId(
      instagramUserId,
      metaAppConfigId,
    );
  }

  async dataDeletionByInstagramUserId(
    instagramUserId: string,
    metaAppConfigId: string,
  ): Promise<IInstagramDataDeletionResult> {
    await this.disconnectAllByInstagramUserId(
      instagramUserId,
      metaAppConfigId,
    );

    const confirmationCode = randomBytes(12).toString("hex");
    const statusUrl = new URL("/data-deletion", this.frontendOrigin);
    statusUrl.searchParams.set("deletion", confirmationCode);

    return {
      confirmationCode,
      statusUrl: statusUrl.toString(),
    };
  }

  private async disconnectAllByInstagramUserId(
    instagramUserId: string,
    metaAppConfigId: string,
  ): Promise<void> {
    const accounts =
      await this.instagramConnectedAccountRepository.findAllByInstagramUserIdAndMetaAppConfigId(
        instagramUserId,
        metaAppConfigId,
      );

    for (const account of accounts) {
      account.markAsDisconnected();
      await this.instagramConnectedAccountRepository.save(account);

      if (account.id) {
        await this.accountSlotRepository.releaseAccount(account.id);
      }
    }
  }
}

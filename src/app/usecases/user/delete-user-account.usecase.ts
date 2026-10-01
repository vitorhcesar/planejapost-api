import { AppError } from "@/domain/errors/app.error";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";

const DELETE_ACCOUNT_SCOPE = "DeleteUserAccountUseCase";

export class DeleteUserAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly zernioAccountService: IZernioAccountService,
    private readonly logger: ILogger,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    await this.disconnectSocialAccounts(userId);
    await this.cancelSubscriptionIfPresent(userId);
    await this.userRepository.deleteById(userId);
  }

  private async disconnectSocialAccounts(userId: string): Promise<void> {
    const accounts =
      await this.socialConnectedAccountRepository.findConnectedByUserId(userId);

    for (const account of accounts) {
      try {
        await this.zernioAccountService.disconnectAccount(account.zernioAccountId);
      } catch (error) {
        this.logger.error(
          DELETE_ACCOUNT_SCOPE,
          "Falha ao desconectar conta social na Zernio durante exclusão de conta",
          error,
          { userId, zernioAccountId: account.zernioAccountId },
        );
      }
    }
  }

  private async cancelSubscriptionIfPresent(userId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      return;
    }

    await this.subscriptionRepository.setCanceled(subscription.id);
  }
}

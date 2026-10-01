import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";
import type { IAdminUserDetailsDto } from "@/app/usecases/admin/dto/admin-user.dto";

export class GetAdminUserDetailsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(userId: string): Promise<IAdminUserDetailsDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const [socialAccountsCount, subscription] = await Promise.all([
      this.userRepository.countSocialAccountsByUserId(userId),
      this.subscriptionRepository.findByUserId(userId),
    ]);

    return {
      ...mapUserToDto(user),
      socialAccountsCount,
      subscriptionStatus: subscription?.status ?? null,
      subscriptionPlanName: subscription?.plan.name ?? null,
    };
  }
}

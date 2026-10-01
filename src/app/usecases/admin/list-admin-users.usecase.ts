import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";
import type { IAdminUserListDto } from "@/app/usecases/admin/dto/admin-user.dto";

export interface IListAdminUsersInput {
  search?: string;
  page?: number;
  limit?: number;
}

export class ListAdminUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(input: IListAdminUsersInput = {}): Promise<IAdminUserListDto> {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;
    const search = input.search?.trim() || undefined;

    const [total, users] = await Promise.all([
      this.userRepository.count(search),
      this.userRepository.findMany({ search, skip, take: limit }),
    ]);

    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [socialAccountsCount, subscription] = await Promise.all([
          this.userRepository.countSocialAccountsByUserId(user.id),
          this.subscriptionRepository.findByUserId(user.id),
        ]);

        return {
          ...mapUserToDto(user),
          socialAccountsCount,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionPlanName: subscription?.plan.name ?? null,
        };
      }),
    );

    return {
      total,
      users: usersWithCounts,
    };
  }
}

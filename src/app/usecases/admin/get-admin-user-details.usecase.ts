import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";
import type { IAdminUserDetailsDto } from "@/app/usecases/admin/dto/admin-user.dto";

export class GetAdminUserDetailsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(userId: string): Promise<IAdminUserDetailsDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const [socialAccountsCount, wallet] = await Promise.all([
      this.userRepository.countSocialAccountsByUserId(userId),
      this.walletRepository.getOrCreateByUserId(userId),
    ]);

    return {
      ...mapUserToDto(user),
      socialAccountsCount,
      walletBalance: wallet.balance,
    };
  }
}

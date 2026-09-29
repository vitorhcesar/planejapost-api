import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";
import type { IUserDto } from "@/app/usecases/user/dto/user.dto";

export class GetAuthenticatedUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(authUserId: string): Promise<IUserDto> {
    const user = await this.userRepository.findById(authUserId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    return mapUserToDto(user);
  }
}

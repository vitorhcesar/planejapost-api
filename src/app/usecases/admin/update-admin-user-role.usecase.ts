import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";
import type { IUserDto } from "@/app/usecases/user/dto/user.dto";

export interface IUpdateAdminUserRoleInput {
  userId: string;
  role: AppRoleEnum;
  actorUserId: string;
}

export class UpdateAdminUserRoleUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: IUpdateAdminUserRoleInput): Promise<IUserDto> {
    if (!Object.values(AppRoleEnum).includes(input.role)) {
      throw new AppError("Papel inválido", 400, "invalid_role");
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    if (
      input.actorUserId === input.userId &&
      input.role !== AppRoleEnum.ADMIN
    ) {
      throw new AppError(
        "Você não pode remover seu próprio acesso de administrador",
        400,
        "cannot_demote_self",
      );
    }

    const updated = await this.userRepository.updateRole(
      input.userId,
      input.role,
    );

    return mapUserToDto(updated);
  }
}

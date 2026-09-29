import { AppError } from "@/domain/errors/app.error";
import type { IEmailVerificationOtpRepository } from "@/domain/repositories/email-verification-otp.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import { isEmailVerificationOtpValid } from "@/app/usecases/email-verification/email-verification-otp.util";
import type { IUserDto } from "@/app/usecases/user/dto/user.dto";
import { mapUserToDto } from "@/app/usecases/user/map-user-to-dto.util";

export class VerifyEmailVerificationOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailVerificationOtpRepository: IEmailVerificationOtpRepository,
  ) {}

  async execute(userId: string, otp: string): Promise<IUserDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    if (user.emailVerified) {
      throw new AppError("E-mail já confirmado", 400, "email_already_verified");
    }

    const storedOtp =
      await this.emailVerificationOtpRepository.findLatestByUserId(userId);

    if (!storedOtp) {
      throw new AppError(
        "Nenhum código encontrado. Envie um novo código.",
        400,
        "email_verification_otp_not_found",
      );
    }

    if (storedOtp.expiresAt.getTime() < Date.now()) {
      await this.emailVerificationOtpRepository.deleteByUserId(userId);
      throw new AppError(
        "Código expirado. Envie um novo código.",
        400,
        "email_verification_otp_expired",
      );
    }

    const isValid = await isEmailVerificationOtpValid(otp, storedOtp.hashedOtp);

    if (!isValid) {
      throw new AppError("Código inválido", 400, "email_verification_otp_invalid");
    }

    const updatedUser = await this.userRepository.markEmailVerified(userId);
    await this.emailVerificationOtpRepository.deleteByUserId(userId);

    return mapUserToDto(updatedUser);
  }
}

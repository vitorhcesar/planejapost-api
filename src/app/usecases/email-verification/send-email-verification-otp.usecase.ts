import { AppError } from "@/domain/errors/app.error";
import type { IEmailService } from "@/domain/services/email.service";
import type { IEmailVerificationOtpRepository } from "@/domain/repositories/email-verification-otp.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import {
  buildEmailVerificationOtpEmailContent,
  generateEmailVerificationOtp,
  getEmailVerificationOtpExpirationDate,
  getEmailVerificationOtpResendCooldownSeconds,
  hashEmailVerificationOtp,
} from "@/app/usecases/email-verification/email-verification-otp.util";

export class SendEmailVerificationOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailVerificationOtpRepository: IEmailVerificationOtpRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(userId: string): Promise<{ cooldownSeconds: number }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    if (user.emailVerified) {
      throw new AppError("E-mail já confirmado", 400, "email_already_verified");
    }

    const latestOtp =
      await this.emailVerificationOtpRepository.findLatestByUserId(userId);

    if (latestOtp) {
      const cooldownSeconds = getEmailVerificationOtpResendCooldownSeconds(
        latestOtp.createdAt,
      );

      if (cooldownSeconds > 0) {
        throw new AppError(
          `Aguarde ${cooldownSeconds}s para reenviar o código`,
          429,
          "email_verification_otp_cooldown",
          { cooldownSeconds },
        );
      }
    }

    const otp = generateEmailVerificationOtp();
    const hashedOtp = await hashEmailVerificationOtp(otp);
    const expiresAt = getEmailVerificationOtpExpirationDate();

    await this.emailVerificationOtpRepository.replaceForUser(
      userId,
      hashedOtp,
      expiresAt,
    );

    const emailContent = buildEmailVerificationOtpEmailContent({
      name: user.name,
      otp,
    });

    await this.emailService.sendEmail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return { cooldownSeconds: 60 };
  }
}

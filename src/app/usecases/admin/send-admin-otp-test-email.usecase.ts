import { buildEmailVerificationOtpEmailContent } from "@/app/usecases/email-verification/email-verification-otp.util";
import { ADMIN_OTP_TEST_CODE } from "@/domain/constants/admin-otp-test.constant";
import { AppError } from "@/domain/errors/app.error";
import type { IEmailService } from "@/domain/services/email.service";

export interface ISendAdminOtpTestEmailResult {
  email: string;
  otp: string;
  sentAt: string;
}

export class SendAdminOtpTestEmailUseCase {
  constructor(private readonly emailService: IEmailService) {}

  async execute(input: {
    email: string;
    name?: string;
  }): Promise<ISendAdminOtpTestEmailResult> {
    const recipientName = input.name?.trim() || "Administrador";
    const emailContent = buildEmailVerificationOtpEmailContent({
      name: recipientName,
      otp: ADMIN_OTP_TEST_CODE,
      isTest: true,
    });

    try {
      await this.emailService.sendEmail({
        to: input.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch {
      throw new AppError(
        "Não foi possível enviar o e-mail de teste. Verifique as configurações SMTP.",
        502,
        "email_send_failed",
      );
    }

    return {
      email: input.email,
      otp: ADMIN_OTP_TEST_CODE,
      sentAt: new Date().toISOString(),
    };
  }
}

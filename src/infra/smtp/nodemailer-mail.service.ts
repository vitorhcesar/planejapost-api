import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type {
  IEmailService,
  ISendEmailInput,
} from "@/domain/services/email.service";
import { EnvService } from "@/infra/config/env.service";

export class NodemailerMailService implements IEmailService {
  private readonly env = EnvService.getInstance();
  private transporter: Transporter | null = null;

  async sendEmail(input: ISendEmailInput): Promise<void> {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: this.env.smtpFrom,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: this.env.smtpHost,
      port: this.env.smtpPort,
      secure: this.env.smtpSecure,
      auth: {
        user: this.env.smtpUsername,
        pass: this.env.smtpPassword,
      },
    });

    return this.transporter;
  }
}

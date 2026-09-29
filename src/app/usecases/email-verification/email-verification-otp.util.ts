const OTP_LENGTH = 6;
const OTP_EXPIRATION_MINUTES = 15;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function generateEmailVerificationOtp(): string {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1) + min);
}

export async function hashEmailVerificationOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex");
}

export async function isEmailVerificationOtpValid(
  otp: string,
  hashedOtp: string,
): Promise<boolean> {
  const candidateHash = await hashEmailVerificationOtp(otp);
  return candidateHash === hashedOtp;
}

export function getEmailVerificationOtpExpirationDate(): Date {
  return new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
}

export function getEmailVerificationOtpResendCooldownSeconds(
  lastSentAt: Date,
): number {
  const elapsedSeconds = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
  const remaining = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
  return remaining > 0 ? remaining : 0;
}

export function buildEmailVerificationOtpEmailContent(input: {
  name: string;
  otp: string;
}): { subject: string; text: string; html: string } {
  const subject = "Confirme seu e-mail — PlanejaPost";
  const text = [
    `Olá, ${input.name}!`,
    "",
    "Use o código abaixo para confirmar seu e-mail:",
    input.otp,
    "",
    "Este código expira em 15 minutos.",
    "Se você não criou uma conta, ignore este e-mail.",
  ].join("\n");

  const html = `
    <p>Olá, <strong>${input.name}</strong>!</p>
    <p>Use o código abaixo para confirmar seu e-mail:</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em;">${input.otp}</p>
    <p>Este código expira em 15 minutos.</p>
    <p>Se você não criou uma conta, ignore este e-mail.</p>
  `.trim();

  return { subject, text, html };
}

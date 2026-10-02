const OTP_LENGTH = 6;
const OTP_EXPIRATION_MINUTES = 15;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const EMAIL_BRAND = {
  primary: "#4F46E5",
  primaryDark: "#4338CA",
  primaryLight: "#EEF2FF",
  background: "#F1F5F9",
  card: "#FFFFFF",
  foreground: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  accent: "#6366F1",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOtpDigitBoxes(otp: string): string {
  return otp
    .split("")
    .map(
      (digit) => `
        <td align="center" style="padding: 0 4px;">
          <div style="width: 44px; height: 52px; line-height: 52px; background-color: ${EMAIL_BRAND.primaryLight}; border: 1px solid ${EMAIL_BRAND.border}; border-radius: 12px; font-size: 28px; font-weight: 700; color: ${EMAIL_BRAND.primary}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
            ${escapeHtml(digit)}
          </div>
        </td>
      `.trim(),
    )
    .join("");
}

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
  isTest?: boolean;
}): { subject: string; text: string; html: string } {
  const safeName = escapeHtml(input.name);
  const safeOtp = escapeHtml(input.otp);
  const subject = input.isTest
    ? "[Teste] Confirme seu e-mail — PlanejaPost"
    : "Confirme seu e-mail — PlanejaPost";

  const text = [
    `Olá, ${input.name}!`,
    "",
    input.isTest ? "Este é um envio de teste administrativo." : undefined,
    "Use o código abaixo para confirmar seu e-mail:",
    input.otp,
    "",
    `Este código expira em ${OTP_EXPIRATION_MINUTES} minutos.`,
    "Se você não criou uma conta, ignore este e-mail.",
  ]
    .filter(Boolean)
    .join("\n");

  const testBanner = input.isTest
    ? `
      <tr>
        <td style="padding: 0 40px 16px;">
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 12px 16px; font-size: 13px; line-height: 1.5; color: #92400E; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <strong>Envio de teste</strong> — este e-mail foi disparado pela área administrativa e não altera nenhuma conta.
          </div>
        </td>
      </tr>
    `.trim()
    : "";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_BRAND.background}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_BRAND.background};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: ${EMAIL_BRAND.card}; border-radius: 16px; border: 1px solid ${EMAIL_BRAND.border}; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);">
          <tr>
            <td style="background: linear-gradient(135deg, ${EMAIL_BRAND.primary} 0%, ${EMAIL_BRAND.accent} 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: rgba(255, 255, 255, 0.15); border-radius: 12px; margin-bottom: 16px; font-size: 24px;">✉️</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.02em;">
                PlanejaPost
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.85); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Confirmação de e-mail
              </p>
            </td>
          </tr>

          ${testBanner}

          <tr>
            <td style="padding: 32px 40px 8px;">
              <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: ${EMAIL_BRAND.foreground}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Olá, <strong>${safeName}</strong>!
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: ${EMAIL_BRAND.muted}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Use o código abaixo para confirmar seu endereço de e-mail e continuar no PlanejaPost.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${buildOtpDigitBoxes(safeOtp)}
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 13px; color: ${EMAIL_BRAND.muted}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Código: <span style="font-weight: 600; color: ${EMAIL_BRAND.foreground}; letter-spacing: 0.15em;">${safeOtp}</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background-color: ${EMAIL_BRAND.primaryLight}; border-radius: 10px; padding: 14px 16px; text-align: center;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${EMAIL_BRAND.primaryDark}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ⏱ Este código expira em <strong>${OTP_EXPIRATION_MINUTES} minutos</strong>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${EMAIL_BRAND.muted}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
                Se você não criou uma conta no PlanejaPost, pode ignorar este e-mail com segurança.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px; background-color: ${EMAIL_BRAND.background}; border-top: 1px solid ${EMAIL_BRAND.border};">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${EMAIL_BRAND.muted}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
                © ${new Date().getFullYear()} PlanejaPost · planejapost.com.br
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

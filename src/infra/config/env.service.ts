import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1),
  ZERNIO_API_KEY: z.string().min(1).optional(),
  ZERNIO_WEBHOOK_SECRET: z.string().min(1).optional(),
  ZERNIO_API_BASE_URL: z.string().url().default("https://zernio.com/api"),
  USE_NGROK: z.enum(["true", "false"]).optional(),
  NGROK_AUTHTOKEN: z.string().min(1).optional(),
  PUBLIC_API_URL: z.string().url(),
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  OASYFY_PUBLIC_KEY: z.string().min(1).optional(),
  OASYFY_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USERNAME: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().email(),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
});

export type TEnv = z.infer<typeof envSchema>;

export class EnvService {
  private static instance: EnvService | null = null;
  private readonly env: TEnv;

  private constructor() {
    this.env = envSchema.parse(process.env);
  }

  static getInstance(): EnvService {
    if (!EnvService.instance) {
      EnvService.instance = new EnvService();
    }

    return EnvService.instance;
  }

  get nodeEnv(): TEnv["NODE_ENV"] {
    return this.env.NODE_ENV;
  }

  get port(): number {
    return this.env.PORT;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get betterAuthSecret(): string {
    return this.env.BETTER_AUTH_SECRET;
  }

  get betterAuthUrl(): string {
    return this.env.BETTER_AUTH_URL;
  }

  get corsOrigin(): string {
    return this.env.CORS_ORIGIN;
  }

  get zernioApiKey(): string {
    if (!this.env.ZERNIO_API_KEY) {
      throw new Error("ZERNIO_API_KEY não configurada");
    }

    return this.env.ZERNIO_API_KEY;
  }

  get zernioWebhookSecret(): string {
    if (!this.env.ZERNIO_WEBHOOK_SECRET) {
      throw new Error("ZERNIO_WEBHOOK_SECRET não configurado");
    }

    return this.env.ZERNIO_WEBHOOK_SECRET;
  }

  get zernioApiBaseUrl(): string {
    return this.env.ZERNIO_API_BASE_URL;
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === "development";
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === "test";
  }

  get useNgrok(): boolean {
    return this.env.USE_NGROK === "true";
  }

  get ngrokAuthtoken(): string | undefined {
    return this.env.NGROK_AUTHTOKEN;
  }

  get publicApiUrl(): string {
    return this.env.PUBLIC_API_URL;
  }

  get redisHost(): string {
    return this.env.REDIS_HOST;
  }

  get redisPort(): number {
    return this.env.REDIS_PORT;
  }

  get oasyfyPublicKey(): string {
    if (!this.env.OASYFY_PUBLIC_KEY) {
      throw new Error("OASYFY_PUBLIC_KEY não configurado");
    }

    return this.env.OASYFY_PUBLIC_KEY;
  }

  get oasyfySecretKey(): string {
    if (!this.env.OASYFY_SECRET_KEY) {
      throw new Error("OASYFY_SECRET_KEY não configurado");
    }

    return this.env.OASYFY_SECRET_KEY;
  }

  get stripeSecretKey(): string {
    if (!this.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY não configurado");
    }

    return this.env.STRIPE_SECRET_KEY;
  }

  get stripeWebhookSecret(): string {
    if (!this.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
    }

    return this.env.STRIPE_WEBHOOK_SECRET;
  }

  get stripePublishableKey(): string | undefined {
    return this.env.STRIPE_PUBLISHABLE_KEY;
  }

  get smtpHost(): string {
    return this.env.SMTP_HOST;
  }

  get smtpPort(): number {
    return this.env.SMTP_PORT;
  }

  get smtpUsername(): string {
    return this.env.SMTP_USERNAME;
  }

  get smtpPassword(): string {
    return this.env.SMTP_PASSWORD;
  }

  get smtpFrom(): string {
    return this.env.SMTP_FROM;
  }

  get smtpSecure(): boolean {
    return this.env.SMTP_SECURE;
  }
}

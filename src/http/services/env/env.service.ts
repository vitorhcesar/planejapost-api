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
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  INSTAGRAM_OAUTH_SCOPES: z
    .string()
    .min(1)
    .default("instagram_business_basic,instagram_business_content_publish"),
  INSTAGRAM_TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  META_APP_CONFIG_ENCRYPTION_KEY: z.string().min(32).optional(),
  PUBLIC_API_URL: z.string().url(),
  MINIO_ENDPOINT: z.string().min(1).default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1).default("solixpost-temp"),
  MINIO_USE_SSL: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  OMEGAPAY_PUBLIC_KEY: z.string().min(1).optional(),
  OMEGAPAY_SECRET_KEY: z.string().min(1).optional(),
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
    this.env = envSchema.parse({
      ...process.env,
      INSTAGRAM_OAUTH_SCOPES:
        process.env.INSTAGRAM_OAUTH_SCOPES ??
        "instagram_business_basic,instagram_business_content_publish",
    });
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

  get instagramRedirectUri(): string {
    if (!this.env.INSTAGRAM_REDIRECT_URI) {
      throw new Error("INSTAGRAM_REDIRECT_URI não configurado");
    }

    return this.env.INSTAGRAM_REDIRECT_URI;
  }

  get instagramOAuthScopes(): string {
    return this.env.INSTAGRAM_OAUTH_SCOPES;
  }

  get instagramTokenEncryptionKey(): string {
    return this.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ?? this.env.BETTER_AUTH_SECRET;
  }

  get metaAppConfigEncryptionKey(): string {
    if (!this.env.META_APP_CONFIG_ENCRYPTION_KEY) {
      throw new Error("META_APP_CONFIG_ENCRYPTION_KEY não configurada");
    }

    return this.env.META_APP_CONFIG_ENCRYPTION_KEY;
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === "development";
  }

  get publicApiUrl(): string {
    return this.env.PUBLIC_API_URL;
  }

  get minioEndpoint(): string {
    return this.env.MINIO_ENDPOINT;
  }

  get minioPort(): number {
    return this.env.MINIO_PORT;
  }

  get minioAccessKey(): string {
    return this.env.MINIO_ACCESS_KEY;
  }

  get minioSecretKey(): string {
    return this.env.MINIO_SECRET_KEY;
  }

  get minioBucket(): string {
    return this.env.MINIO_BUCKET;
  }

  get minioUseSsl(): boolean {
    return this.env.MINIO_USE_SSL;
  }

  get redisHost(): string {
    return this.env.REDIS_HOST;
  }

  get redisPort(): number {
    return this.env.REDIS_PORT;
  }

  get omegapayPublicKey(): string {
    if (!this.env.OMEGAPAY_PUBLIC_KEY) {
      throw new Error("OMEGAPAY_PUBLIC_KEY não configurado");
    }

    return this.env.OMEGAPAY_PUBLIC_KEY;
  }

  get omegapaySecretKey(): string {
    if (!this.env.OMEGAPAY_SECRET_KEY) {
      throw new Error("OMEGAPAY_SECRET_KEY não configurado");
    }

    return this.env.OMEGAPAY_SECRET_KEY;
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

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import { EnvService } from "@/infra/config/env.service";
import { getPrismaClient } from "@/infra/database/prisma/client";

const env = EnvService.getInstance();

export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: [env.corsOrigin],
  database: prismaAdapter(getPrismaClient(), {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: AppRoleEnum.CLIENT,
        input: false,
        returned: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export type TAuthSession = typeof auth.$Infer.Session;

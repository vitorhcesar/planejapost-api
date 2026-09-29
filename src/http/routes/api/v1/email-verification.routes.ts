import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { verifyEmailVerificationOtpBodySchema } from "@/http/validation/schemas/email-verification.schema";

export class EmailVerificationRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const { sendOtp, verifyOtp } = this.container.useCases.emailVerification;

    route.post("/email-verification/send-otp", async (context) => {
      const { authUserId } = getAuthContext(context);
      const result = await sendOtp.execute(authUserId!);
      return this.successResponse("Código enviado", result, 200);
    });

    route.post("/email-verification/verify-otp", async (context) => {
      const { authUserId } = getAuthContext(context);
      const body = verifyEmailVerificationOtpBodySchema.parse(context.body);
      const user = await verifyOtp.execute(authUserId!, body.otp);

      return this.successResponse("E-mail confirmado", user, 200);
    });

    return route;
  }
}

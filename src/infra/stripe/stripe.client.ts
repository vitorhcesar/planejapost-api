import { AppError } from "@/domain/errors/app.error";
import { EnvService } from "@/infra/config/env.service";

export interface ICreateStripeCheckoutInput {
  invoiceId: string;
  userId: string;
  amount: number;
  planName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string | null;
}

export interface ICreateStripeCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface IStripeService {
  createCheckoutSession(
    input: ICreateStripeCheckoutInput,
  ): Promise<ICreateStripeCheckoutResult>;
  constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<Record<string, unknown>>;
}

export class StripeClient implements IStripeService {
  private readonly env = EnvService.getInstance();

  async createCheckoutSession(
    input: ICreateStripeCheckoutInput,
  ): Promise<ICreateStripeCheckoutResult> {
    const amountInCents = Math.round(input.amount * 100);

    const body: Record<string, unknown> = {
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: {
        subscriptionInvoiceId: input.invoiceId,
        userId: input.userId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: amountInCents,
            product_data: {
              name: `PlanejaPost — ${input.planName}`,
            },
          },
        },
      ],
    };

    if (input.stripeCustomerId) {
      body.customer = input.stripeCustomerId;
      delete body.customer_email;
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: this.encodeFormBody(body),
    });

    const data = (await response.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!response.ok || !data.id || !data.url) {
      throw new AppError(
        data.error?.message ?? "Falha ao criar sessão Stripe Checkout",
        response.status,
        "stripe_checkout_failed",
      );
    }

    return {
      checkoutUrl: data.url,
      sessionId: data.id,
    };
  }

  async constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<Record<string, unknown>> {
    const secret = this.env.stripeWebhookSecret;
    const elements = signature.split(",");
    const timestampPart = elements.find((part) => part.startsWith("t="));
    const signaturePart = elements.find((part) => part.startsWith("v1="));

    if (!timestampPart || !signaturePart) {
      throw new AppError("Assinatura Stripe inválida", 400, "stripe_invalid_signature");
    }

    const timestamp = timestampPart.replace("t=", "");
    const expectedSignature = signaturePart.replace("v1=", "");
    const signedPayload = `${timestamp}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload),
    );
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    if (computedSignature !== expectedSignature) {
      throw new AppError("Assinatura Stripe inválida", 400, "stripe_invalid_signature");
    }

    return JSON.parse(payload) as Record<string, unknown>;
  }

  private encodeFormBody(
    value: unknown,
    prefix = "",
  ): URLSearchParams {
    const params = new URLSearchParams();

    const append = (key: string, val: unknown) => {
      if (val === undefined || val === null) {
        return;
      }

      if (typeof val === "object" && !Array.isArray(val)) {
        for (const [childKey, childValue] of Object.entries(
          val as Record<string, unknown>,
        )) {
          append(`${key}[${childKey}]`, childValue);
        }
        return;
      }

      if (Array.isArray(val)) {
        val.forEach((item, index) => {
          append(`${key}[${index}]`, item);
        });
        return;
      }

      params.append(key, String(val));
    };

    if (prefix) {
      append(prefix, value);
      return params;
    }

    if (typeof value === "object" && value !== null) {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        append(key, val);
      }
    }

    return params;
  }
}

import { InstagramConnectedAccountStatusEnum } from "@/domain/enums/instagram.enum";
import { AppError } from "@/domain/errors/app.error";

export type InstagramAccountIssueType =
  | "token_expired"
  | "account_expired"
  | "disconnected";

export interface IInstagramAccountConnectionHealth {
  isTokenExpired: boolean;
  hasConnectionIssue: boolean;
  issueType: InstagramAccountIssueType | null;
}

const AUTH_ERROR_CODES = new Set([
  "instagram_token_refresh_failed",
  "instagram_profile_fetch_failed",
  "instagram_oauth_exchange_failed",
  "instagram_long_lived_token_failed",
]);

const AUTH_ERROR_MESSAGE_PATTERNS = [
  /oauth/i,
  /access token/i,
  /token.*expir/i,
  /session.*invalid/i,
  /error validating access token/i,
  /invalid.*token/i,
];

export function getInstagramAccountConnectionHealth(input: {
  status: string;
  tokenExpiresAt: Date;
  referenceDate?: Date;
}): IInstagramAccountConnectionHealth {
  const referenceDate = input.referenceDate ?? new Date();
  const isTokenExpired = input.tokenExpiresAt.getTime() <= referenceDate.getTime();
  const status = input.status as InstagramConnectedAccountStatusEnum;

  let issueType: InstagramAccountIssueType | null = null;

  if (status === InstagramConnectedAccountStatusEnum.DISCONNECTED) {
    issueType = "disconnected";
  } else if (status === InstagramConnectedAccountStatusEnum.EXPIRED) {
    issueType = "account_expired";
  } else if (isTokenExpired) {
    issueType = "token_expired";
  }

  const hasConnectionIssue =
    status !== InstagramConnectedAccountStatusEnum.CONNECTED || isTokenExpired;

  return {
    isTokenExpired,
    hasConnectionIssue,
    issueType,
  };
}

export function isInstagramAccountAuthFailure(error: unknown): boolean {
  if (error instanceof AppError && error.code && AUTH_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return AUTH_ERROR_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

export const ZERNIO_WEBHOOK_EVENTS = [
  "account.connected",
  "account.disconnected",
  "post.scheduled",
  "post.platform.published",
  "post.platform.failed",
  "post.published",
  "post.partial",
  "post.failed",
  "post.cancelled",
  "analytics.synced",
] as const;

export type TZernioWebhookEvent = (typeof ZERNIO_WEBHOOK_EVENTS)[number];

export function mergeZernioWebhookEvents(
  existingEvents: string[] | undefined,
): string[] {
  return Array.from(new Set([...(existingEvents ?? []), ...ZERNIO_WEBHOOK_EVENTS]));
}

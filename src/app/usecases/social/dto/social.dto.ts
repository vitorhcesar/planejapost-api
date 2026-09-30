export interface ISocialConnectedAccountDto {
  id: string;
  platform: string;
  zernioAccountId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  canPost: boolean;
  needsReconnect: boolean;
  accountSlotId: string | null;
  isExpired: boolean;
  connectedAt: string;
  disconnectedAt: string | null;
}

export interface ISocialConnectSessionDto {
  sessionId: string;
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface ISocialSelectionOptionDto {
  id: string;
  name: string;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
}

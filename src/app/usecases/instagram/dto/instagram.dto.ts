export interface IInstagramConnectedAccountDto {
  id: string;
  instagramUserId: string;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
  scopes: string[];
  status: string;
  tokenExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  integrationSource: "legacy_project_app" | "user_meta_app";
}

export interface IInstagramConnectSessionDto {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

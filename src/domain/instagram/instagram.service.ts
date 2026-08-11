export interface IInstagramOAuthTokens {
  accessToken: string;
  expiresIn: number;
  instagramUserId: string;
  scopes: string[];
}

export interface IInstagramOAuthCredentials {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface IInstagramProfile {
  instagramUserId: string;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
}

export interface IInstagramOAuthService {
  buildAuthorizationUrl(state: string): string;
  exchangeAuthorizationCode(code: string): Promise<IInstagramOAuthTokens>;
  refreshLongLivedToken(accessToken: string): Promise<IInstagramOAuthTokens>;
}

export interface IInstagramOAuthServiceFactory {
  create(credentials: IInstagramOAuthCredentials): IInstagramOAuthService;
}

export interface IInstagramGraphService {
  getProfile(accessToken: string): Promise<IInstagramProfile>;
}

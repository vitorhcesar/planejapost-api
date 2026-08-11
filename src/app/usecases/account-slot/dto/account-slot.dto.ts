export type InstagramAccountIssueType =
  | "token_expired"
  | "account_expired"
  | "disconnected";

export interface IAccountSlotAccountDto {
  id: string;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
  status: string;
  tokenExpiresAt: string;
  isTokenExpired: boolean;
  hasConnectionIssue: boolean;
  issueType: InstagramAccountIssueType | null;
  integrationSource: "legacy_project_app" | "user_meta_app";
}

export interface IAccountSlotDto {
  id: string;
  status: string;
  expiresAt: string;
  isExpired: boolean;
  instagramAccount: IAccountSlotAccountDto | null;
  createdAt: string;
}

export interface IAccountSlotPricingDto {
  unitPrice: number;
  combos: Array<{
    quantity: number;
    discountRate: number;
    unitPrice: number;
    total: number;
    savings: number;
  }>;
}

export interface IPurchaseAccountSlotsResultDto {
  slots: IAccountSlotDto[];
  totalCharged: number;
  newBalance: number;
}

export interface IRenewAccountSlotResultDto {
  slot: IAccountSlotDto;
  totalCharged: number;
  newBalance: number;
}

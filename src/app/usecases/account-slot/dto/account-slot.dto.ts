export interface IAccountSlotAccountDto {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  canPost: boolean;
  needsReconnect: boolean;
  workspaceId: string;
  workspaceName: string;
}

export interface IAccountSlotDto {
  id: string;
  status: string;
  expiresAt: string;
  isExpired: boolean;
  socialAccount: IAccountSlotAccountDto | null;
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

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
  isExpired: boolean;
  socialAccount: IAccountSlotAccountDto | null;
  createdAt: string;
}

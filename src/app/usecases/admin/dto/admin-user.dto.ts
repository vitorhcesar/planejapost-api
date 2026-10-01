import type { IUserDto } from "@/app/usecases/user/dto/user.dto";

export interface IAdminUserListItemDto extends IUserDto {
  socialAccountsCount: number;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
}

export interface IAdminUserListDto {
  total: number;
  users: IAdminUserListItemDto[];
}

export interface IAdminUserDetailsDto extends IUserDto {
  socialAccountsCount: number;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
}

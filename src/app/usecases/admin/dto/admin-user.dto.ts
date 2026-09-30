import type { IUserDto } from "@/app/usecases/user/dto/user.dto";

export interface IAdminUserListItemDto extends IUserDto {
  socialAccountsCount: number;
  walletBalance: number;
}

export interface IAdminUserListDto {
  total: number;
  users: IAdminUserListItemDto[];
}

export interface IAdminUserDetailsDto extends IUserDto {
  socialAccountsCount: number;
  walletBalance: number;
}

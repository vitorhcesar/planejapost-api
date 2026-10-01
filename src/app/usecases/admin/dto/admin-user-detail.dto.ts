import type { IUserDto } from "@/app/usecases/user/dto/user.dto";

export interface IAdminUserMetricsDto {
  socialAccountsCount: number;
  publicationsCount: number;
  workspacesCount: number;
}

export interface IAdminUserSubscriptionSummaryDto {
  id: string;
  planId: string;
  planName: string;
  status: string;
  trialEndsAt: string | null;
  trialGrantedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  dueAt: string | null;
}

export interface IAdminUserOpenInvoiceDto {
  id: string;
  subscriptionId: string;
  type: string;
  status: string;
  amount: number;
  dueAt: string;
  createdAt: string;
  manualPaidReason: string | null;
  manualPaidAt: string | null;
}

export interface IAdminUserDetailDto {
  user: IUserDto;
  metrics: IAdminUserMetricsDto;
  subscription: IAdminUserSubscriptionSummaryDto | null;
  openInvoices: IAdminUserOpenInvoiceDto[];
}

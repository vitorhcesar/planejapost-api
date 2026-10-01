export interface IWorkspaceDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  accountCount: number;
  connectedAccountCount: number;
  createdAt: string;
}

export interface IListWorkspacesResultDto {
  items: IWorkspaceDto[];
}

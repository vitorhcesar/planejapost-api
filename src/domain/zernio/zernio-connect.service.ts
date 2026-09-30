import type {
  IZernioConnectUrlInput,
  IZernioConnectUrlResult,
  IZernioSelectFacebookPageInput,
  IZernioSelectLinkedInOrganizationInput,
  IZernioSelectionOption,
} from "@/domain/zernio/zernio.types";

export interface IZernioConnectService {
  getConnectUrl(input: IZernioConnectUrlInput): Promise<IZernioConnectUrlResult>;
  listFacebookPages(input: {
    profileId: string;
    tempToken: string;
  }): Promise<IZernioSelectionOption[]>;
  selectFacebookPage(
    input: IZernioSelectFacebookPageInput,
  ): Promise<{ accountId: string; username: string }>;
  listLinkedInOrganizations(input: {
    profileId: string;
    tempToken: string;
  }): Promise<IZernioSelectionOption[]>;
  selectLinkedInOrganization(
    input: IZernioSelectLinkedInOrganizationInput,
  ): Promise<{ accountId: string; username: string }>;
}

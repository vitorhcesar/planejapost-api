export interface IPublicationTargetDto {
  id: string;
  socialConnectedAccountId: string;
  platform: string;
  zernioAccountId: string;
  status: string;
  platformPostId: string | null;
  platformPostUrl: string | null;
  errorMessage: string | null;
  errorCode: string | null;
}

export interface IPublicationDto {
  id: string;
  type: string;
  destinationScope: string;
  caption: string | null;
  mediaUrl: string;
  mediaUrls: string[];
  zernioPostId: string | null;
  status: string;
  targets: IPublicationTargetDto[];
  createdAt: string;
  updatedAt: string;
}

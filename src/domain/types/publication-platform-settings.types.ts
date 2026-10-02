export enum InstagramContentTypeEnum {
  FEED = "feed",
  STORY = "story",
  REEL = "reel",
  CAROUSEL = "carousel",
}

export interface IInstagramPlatformSettings {
  contentType: InstagramContentTypeEnum;
  isAiGenerated: boolean;
  collaborators: string[];
  firstComment: string;
  customCaption: string;
}

export interface IPlatformSettings {
  instagram?: IInstagramPlatformSettings;
}

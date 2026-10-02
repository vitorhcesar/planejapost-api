import type {
  IZernioAnalyticsDelta,
  IZernioPostAnalytics,
} from "@/domain/zernio/zernio.types";

export interface IZernioAnalyticsService {
  getPostAnalytics(postId: string): Promise<IZernioPostAnalytics | null>;
  getAnalyticsDelta(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<IZernioAnalyticsDelta>;
}

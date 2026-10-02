export interface IZernioAnalyticsSyncStateRecord {
  nextCursor: string | null;
  updatedAt: Date;
}

export interface IZernioAnalyticsSyncStateRepository {
  getState(): Promise<IZernioAnalyticsSyncStateRecord>;
  saveNextCursor(nextCursor: string): Promise<void>;
}

export interface IPublicationQueue {
  enqueue(publicationId: string): Promise<void>;
}

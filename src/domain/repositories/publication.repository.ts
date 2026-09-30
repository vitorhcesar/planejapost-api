import type { Publication } from "@/domain/entities/publication.entity";

export interface IPublicationRepository {
  findById(id: string): Promise<Publication | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Publication | null>;
  findByZernioPostId(zernioPostId: string): Promise<Publication | null>;
  findAllByUserId(userId: string): Promise<Publication[]>;
  save(publication: Publication): Promise<Publication>;
  countByType(type: string): Promise<number>;
}

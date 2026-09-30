import type { Publication } from "@/domain/entities/publication.entity";
import type { PublicationStatusEnum } from "@/domain/enums/publication.enum";

export interface IPublicationListFilters {
  status?: PublicationStatusEnum;
  from?: Date;
  to?: Date;
}

export interface IPublicationRepository {
  findById(id: string): Promise<Publication | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Publication | null>;
  findByZernioPostId(zernioPostId: string): Promise<Publication | null>;
  findAllByUserId(userId: string): Promise<Publication[]>;
  findAllByUserIdWithFilters(
    userId: string,
    filters: IPublicationListFilters,
  ): Promise<Publication[]>;
  save(publication: Publication): Promise<Publication>;
  countByType(type: string): Promise<number>;
}

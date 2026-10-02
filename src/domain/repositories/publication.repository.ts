import type { Publication } from "@/domain/entities/publication.entity";
import type { PublicationStatusEnum } from "@/domain/enums/publication.enum";

export interface IPublicationListFilters {
  status?: PublicationStatusEnum;
  workspaceId?: string;
  from?: Date;
  to?: Date;
}

export interface IPublicationRepository {
  findById(id: string): Promise<Publication | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Publication | null>;
  findByZernioPostId(zernioPostId: string): Promise<Publication | null>;
  findAnalyticsEligibleByZernioAccountId(
    zernioAccountId: string,
    limit = 25,
  ): Promise<Publication[]>;
  findAllByUserId(userId: string): Promise<Publication[]>;
  findAllByUserIdWithFilters(
    userId: string,
    filters: IPublicationListFilters,
  ): Promise<Publication[]>;
  save(publication: Publication): Promise<Publication>;
  countByType(type: string): Promise<number>;
}

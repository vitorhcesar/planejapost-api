import type { SocialConnectSession } from "@/domain/entities/social-connect-session.entity";

export interface ISocialConnectSessionRepository {
  create(session: SocialConnectSession): Promise<SocialConnectSession>;
  findById(id: string): Promise<SocialConnectSession | null>;
  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<SocialConnectSession | null>;
  findByState(state: string): Promise<SocialConnectSession | null>;
  save(session: SocialConnectSession): Promise<SocialConnectSession>;
  deleteById(id: string): Promise<void>;
}

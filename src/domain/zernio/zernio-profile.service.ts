import type {
  ICreateZernioProfileInput,
  IZernioProfile,
} from "@/domain/zernio/zernio.types";

export interface IZernioProfileService {
  createProfile(input: ICreateZernioProfileInput): Promise<IZernioProfile>;
  getProfile(profileId: string): Promise<IZernioProfile | null>;
}

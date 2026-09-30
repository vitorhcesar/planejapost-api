import type {
  IZernioPresignUploadInput,
  IZernioPresignUploadResult,
} from "@/domain/zernio/zernio.types";

export interface IZernioMediaService {
  presignUpload(input: IZernioPresignUploadInput): Promise<IZernioPresignUploadResult>;
  uploadToPresignedUrl(input: {
    uploadUrl: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<void>;
}

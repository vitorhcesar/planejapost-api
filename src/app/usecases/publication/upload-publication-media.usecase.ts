import { AppError } from "@/domain/errors/app.error";
import type { ITemporaryPublicationMediaStorage } from "@/domain/storages/temporary-publication-media.storage";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export interface IUploadPublicationMediaInput {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface IUploadPublicationMediaResult {
  objectKey: string;
}

export class UploadPublicationMediaUseCase {
  constructor(
    private readonly temporaryMediaStorage: ITemporaryPublicationMediaStorage,
  ) {}

  async execute(
    authUserId: string,
    file: IUploadPublicationMediaInput,
  ): Promise<IUploadPublicationMediaResult> {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new AppError(
        `Tipo de arquivo não suportado: ${file.type}. Use JPEG, PNG, WebP ou MP4.`,
        400,
        "unsupported_media_type",
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppError(
        "O arquivo excede o tamanho máximo de 100 MB",
        400,
        "file_too_large",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectKey = this.temporaryMediaStorage.buildObjectKey(
      authUserId,
      file.name,
    );

    await this.temporaryMediaStorage.upload({
      objectKey,
      buffer,
      contentType: file.type,
      size: file.size,
    });

    return { objectKey };
  }
}

import { describe, expect, it } from "bun:test";
import { UploadPublicationMediaUseCase } from "@/app/usecases/publication/upload-publication-media.usecase";
import { AppError } from "@/domain/errors/app.error";
import type {
  ITemporaryPublicationMediaStorage,
  IUploadTemporaryMediaInput,
} from "@/domain/storages/temporary-publication-media.storage";
import type { IZernioMediaService } from "@/domain/zernio/zernio-media.service";

class InMemoryTemporaryMediaStorage {
  uploads: IUploadTemporaryMediaInput[] = [];

  async upload(input: IUploadTemporaryMediaInput) {
    this.uploads.push(input);
  }

  async getStream() {
    throw new Error("not implemented");
  }

  async delete() {}

  buildObjectKey(userId: string, originalFilename: string) {
    return `temp/${userId}/${originalFilename}`;
  }
}

class MockZernioMediaService implements IZernioMediaService {
  uploads: Array<{ uploadUrl: string; contentType: string }> = [];

  async presignUpload() {
    return {
      uploadUrl: "https://upload.example.com/file",
      publicUrl: "https://media.example.com/file.jpg",
    };
  }

  async uploadToPresignedUrl(input: {
    uploadUrl: string;
    buffer: Buffer;
    contentType: string;
  }) {
    this.uploads.push({
      uploadUrl: input.uploadUrl,
      contentType: input.contentType,
    });
  }
}

function createFile(input: {
  name: string;
  type: string;
  size: number;
  content?: string;
}) {
  const buffer = Buffer.from(input.content ?? "file-content");

  return {
    name: input.name,
    type: input.type,
    size: input.size,
    arrayBuffer: async () => buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  };
}

describe("UploadPublicationMediaUseCase", () => {
  it("rejects unsupported mime types", async () => {
    const storage = new InMemoryTemporaryMediaStorage();
    const useCase = new UploadPublicationMediaUseCase(
      storage as unknown as ITemporaryPublicationMediaStorage,
      new MockZernioMediaService(),
    );

    try {
      await useCase.execute(
        "user-1",
        createFile({
          name: "file.pdf",
          type: "application/pdf",
          size: 10,
        }),
      );
      throw new Error("Expected upload to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("unsupported_media_type");
    }
  });

  it("rejects files larger than 100 MB", async () => {
    const storage = new InMemoryTemporaryMediaStorage();
    const useCase = new UploadPublicationMediaUseCase(
      storage as unknown as ITemporaryPublicationMediaStorage,
      new MockZernioMediaService(),
    );

    try {
      await useCase.execute(
        "user-1",
        createFile({
          name: "large.mp4",
          type: "video/mp4",
          size: 101 * 1024 * 1024,
        }),
      );
      throw new Error("Expected upload to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("file_too_large");
    }
  });

  it("uploads valid media and returns object key and public url", async () => {
    const storage = new InMemoryTemporaryMediaStorage();
    const zernioMedia = new MockZernioMediaService();
    const useCase = new UploadPublicationMediaUseCase(
      storage as unknown as ITemporaryPublicationMediaStorage,
      zernioMedia,
    );

    const result = await useCase.execute(
      "user-1",
      createFile({
        name: "photo.jpg",
        type: "image/jpeg",
        size: 1024,
      }),
    );

    expect(result.objectKey).toBe("temp/user-1/photo.jpg");
    expect(result.publicUrl).toBe("https://media.example.com/file.jpg");
    expect(storage.uploads).toHaveLength(1);
    expect(zernioMedia.uploads).toHaveLength(1);
  });
});

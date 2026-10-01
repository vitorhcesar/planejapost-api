import { describe, expect, it } from "bun:test";
import { UploadPublicationMediaUseCase } from "@/app/usecases/publication/upload-publication-media.usecase";
import { AppError } from "@/domain/errors/app.error";
import type { IZernioMediaService } from "@/domain/zernio/zernio-media.service";

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
    const useCase = new UploadPublicationMediaUseCase(new MockZernioMediaService());

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
    const useCase = new UploadPublicationMediaUseCase(new MockZernioMediaService());

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

  it("uploads valid media and returns public url", async () => {
    const zernioMedia = new MockZernioMediaService();
    const useCase = new UploadPublicationMediaUseCase(zernioMedia);

    const result = await useCase.execute(
      "user-1",
      createFile({
        name: "photo.jpg",
        type: "image/jpeg",
        size: 1024,
      }),
    );

    expect(result.publicUrl).toBe("https://media.example.com/file.jpg");
    expect(zernioMedia.uploads).toHaveLength(1);
  });
});

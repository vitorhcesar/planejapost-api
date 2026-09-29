import * as Minio from "minio";
import { randomUUID } from "node:crypto";
import * as path from "node:path";
import { Readable } from "node:stream";
import type {
  ITemporaryPublicationMediaStorage,
  IUploadTemporaryMediaInput,
} from "@/domain/storages/temporary-publication-media.storage";
import { EnvService } from "@/infra/config/env.service";

export class MinioTemporaryPublicationMediaStorage
  implements ITemporaryPublicationMediaStorage
{
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private initialized = false;

  constructor() {
    const env = EnvService.getInstance();

    this.client = new Minio.Client({
      endPoint: env.minioEndpoint,
      port: env.minioPort,
      useSSL: env.minioUseSsl,
      accessKey: env.minioAccessKey,
      secretKey: env.minioSecretKey,
    });

    this.bucket = env.minioBucket;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const exists = await this.client.bucketExists(this.bucket);

    if (!exists) {
      await this.client.makeBucket(this.bucket);

      const lifecycleConfig = {
        Rule: [
          {
            ID: "expire-temp-objects",
            Status: "Enabled",
            Filter: { Prefix: "temp/" },
            Expiration: { Days: 1 },
          },
        ],
      };
      await this.client.setBucketLifecycle(this.bucket, lifecycleConfig);
    }

    this.initialized = true;
  }

  async upload(input: IUploadTemporaryMediaInput): Promise<void> {
    await this.ensureInitialized();

    const readable = Readable.from(input.buffer);

    await this.client.putObject(
      this.bucket,
      input.objectKey,
      readable,
      input.size,
      { "Content-Type": input.contentType },
    );
  }

  async getStream(objectKey: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    size: number;
  }> {
    await this.ensureInitialized();

    const stat = await this.client.statObject(this.bucket, objectKey);
    const stream = await this.client.getObject(this.bucket, objectKey);

    return {
      stream,
      contentType: (stat.metaData?.["content-type"] as string | undefined) ?? "application/octet-stream",
      size: stat.size,
    };
  }

  async delete(objectKey: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.removeObject(this.bucket, objectKey);
    } catch {
      // Ignorar erros de deleção — o lifecycle do bucket vai limpar órfãos
    }
  }

  buildObjectKey(userId: string, originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const uuid = randomUUID();
    return `temp/${userId}/${uuid}${ext}`;
  }
}

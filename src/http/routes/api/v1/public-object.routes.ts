import { Elysia } from "elysia";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";

export class PublicObjectRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const storage = this.container.infrastructure.temporaryMediaStorage;

    return new Elysia().get(
      "/public/objects/*",
      async (context) => {
        const objectKey = (context.params as Record<string, string>)["*"];

        if (!objectKey || !objectKey.startsWith("temp/")) {
          throw new AppError("Objeto não encontrado", 404, "object_not_found");
        }

        try {
          const { stream, contentType, size } = await storage.getStream(objectKey);

          return new Response(stream as unknown as ReadableStream, {
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(size),
              "Cache-Control": "private, no-store",
            },
          });
        } catch {
          throw new AppError("Objeto não encontrado", 404, "object_not_found");
        }
      },
    ) as THttpRoute;
  }
}

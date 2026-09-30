import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import { createPublicationBodySchema } from "@/http/validation/schemas/publication.schema";

export class PublicationRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const {
      list,
      uploadMedia,
      createAndPublish,
      getThumbnail,
      get,
    } = this.container.useCases.publication;

    route.get("/publications", async (context) => {
      const { authUserId } = getAuthContext(context);
      const publications = await list.execute(authUserId!);
      return this.successResponse("OK", publications, 200);
    });

    route.post("/publications/upload-media", async (context) => {
      const { authUserId } = getAuthContext(context);

      const body = context.body as Record<string, unknown> | null;
      const file = (body?.file instanceof File ? body.file : null) as File | null;

      if (!file) {
        throw new AppError("Campo 'file' é obrigatório", 400, "file_required");
      }

      const { objectKey, publicUrl } = await uploadMedia.execute(authUserId!, file);

      return this.successResponse(
        "Mídia enviada com sucesso",
        { objectKey, publicUrl },
        201,
      );
    });

    route.post("/publications", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedBody = createPublicationBodySchema.safeParse(context.body);

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const publication = await createAndPublish.execute(
        authUserId!,
        parsedBody.data,
      );

      return this.successResponse("Publicação enviada", publication, 202);
    });

    route.get("/publications/:publicationId/thumbnail", async (context) => {
      const { authUserId } = getAuthContext(context);
      const { publicationId } = context.params;

      const thumbnailUrl = await getThumbnail.execute(
        authUserId!,
        publicationId,
      );

      return this.successResponse("OK", { thumbnailUrl }, 200);
    });

    route.get("/publications/:publicationId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const publicationId = context.params.publicationId;

      if (!publicationId) {
        throw new AppError(
          "Publicação inválida",
          400,
          "invalid_publication_id",
        );
      }

      const publication = await get.execute(authUserId!, publicationId);

      return this.successResponse("OK", publication, 200);
    });

    return route;
  }
}

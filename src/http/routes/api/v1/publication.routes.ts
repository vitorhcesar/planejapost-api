import { getAuthContext } from "@/http/client";
import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { AppError } from "@/domain/errors/app.error";
import {
  createPublicationBodySchema,
  listPublicationsQuerySchema,
  reschedulePublicationBodySchema,
} from "@/http/validation/schemas/publication.schema";
import { upsertPublicationQueueBodySchema } from "@/http/validation/schemas/publication-queue.schema";

export class PublicationRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createUserRoute();
    const {
      list,
      uploadMedia,
      createAndPublish,
      getThumbnail,
      get,
      reschedule,
      cancel,
      getQueue,
      upsertQueue,
    } = this.container.useCases.publication;

    route.get("/publication-queue", async (context) => {
      const { authUserId } = getAuthContext(context);
      const queue = await getQueue.execute(authUserId!);
      return this.successResponse("OK", queue, 200);
    });

    route.put("/publication-queue", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedBody = upsertPublicationQueueBodySchema.safeParse(context.body);

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const queue = await upsertQueue.execute(authUserId!, parsedBody.data);
      return this.successResponse("Horários salvos", queue, 200);
    });

    route.get("/publications", async (context) => {
      const { authUserId } = getAuthContext(context);
      const parsedQuery = listPublicationsQuerySchema.safeParse(context.query);

      if (!parsedQuery.success) {
        throw new AppError("Parâmetros inválidos", 400, "validation", {
          issues: parsedQuery.error.flatten(),
        });
      }

      const publications = await list.execute(authUserId!, parsedQuery.data);
      return this.successResponse("OK", publications, 200);
    });

    route.post("/publications/upload-media", async (context) => {
      const { authUserId } = getAuthContext(context);

      const body = context.body as Record<string, unknown> | null;
      const file = (body?.file instanceof File ? body.file : null) as File | null;

      if (!file) {
        throw new AppError("Campo 'file' é obrigatório", 400, "file_required");
      }

      const { publicUrl } = await uploadMedia.execute(authUserId!, file);

      return this.successResponse(
        "Mídia enviada com sucesso",
        { publicUrl },
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

    route.patch("/publications/:publicationId/schedule", async (context) => {
      const { authUserId } = getAuthContext(context);
      const publicationId = context.params.publicationId;

      if (!publicationId) {
        throw new AppError(
          "Publicação inválida",
          400,
          "invalid_publication_id",
        );
      }

      const parsedBody = reschedulePublicationBodySchema.safeParse(context.body);

      if (!parsedBody.success) {
        throw new AppError("Dados inválidos", 400, "validation", {
          issues: parsedBody.error.flatten(),
        });
      }

      const publication = await reschedule.execute(
        authUserId!,
        publicationId,
        parsedBody.data,
      );

      return this.successResponse("Agendamento atualizado", publication, 200);
    });

    route.delete("/publications/:publicationId", async (context) => {
      const { authUserId } = getAuthContext(context);
      const publicationId = context.params.publicationId;

      if (!publicationId) {
        throw new AppError(
          "Publicação inválida",
          400,
          "invalid_publication_id",
        );
      }

      const publication = await cancel.execute(authUserId!, publicationId);

      return this.successResponse("Publicação cancelada", publication, 200);
    });

    return route;
  }
}

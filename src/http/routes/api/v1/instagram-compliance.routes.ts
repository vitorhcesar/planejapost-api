import { BaseHttpRoute, type THttpRoute } from "@/http/routes/base-http-route";
import { parseMetaSignedRequest } from "@/infra/meta/parse-meta-signed-request.util";

async function extractSignedRequest(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const bodyText = await request.text();
    const params = new URLSearchParams(bodyText);

    return params.get("signed_request");
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    return formData.get("signed_request")?.toString() ?? null;
  }

  return null;
}

export class InstagramComplianceRoutes extends BaseHttpRoute {
  build(): THttpRoute {
    const route = this.serverClient.createPublicRoute();
    const { handleMetaCompliance } = this.container.useCases.instagram;
    const { metaAppConfig } = this.container.repositories;

    route.post("/meta-compliance/:publicId/deauthorize", async (context) => {
      const metaAppConfigEntity = await metaAppConfig.findByPublicId(
        context.params.publicId,
      );

      if (!metaAppConfigEntity) {
        return new Response("Invalid configuration", { status: 404 });
      }

      const signedRequest = await extractSignedRequest(context.request);

      if (!signedRequest) {
        return new Response("Missing signed_request", { status: 400 });
      }

      const payload = parseMetaSignedRequest(
        signedRequest,
        metaAppConfigEntity.appSecret,
      );

      if (!payload) {
        return new Response("Invalid signed_request", { status: 403 });
      }

      await handleMetaCompliance.deauthorizeByInstagramUserId(
        payload.user_id,
        metaAppConfigEntity.id,
      );

      return new Response("OK", { status: 200 });
    });

    route.post("/meta-compliance/:publicId/data-deletion", async (context) => {
      const metaAppConfigEntity = await metaAppConfig.findByPublicId(
        context.params.publicId,
      );

      if (!metaAppConfigEntity) {
        return new Response("Invalid configuration", { status: 404 });
      }

      const signedRequest = await extractSignedRequest(context.request);

      if (!signedRequest) {
        return new Response("Missing signed_request", { status: 400 });
      }

      const payload = parseMetaSignedRequest(
        signedRequest,
        metaAppConfigEntity.appSecret,
      );

      if (!payload) {
        return new Response("Invalid signed_request", { status: 403 });
      }

      const result =
        await handleMetaCompliance.dataDeletionByInstagramUserId(
          payload.user_id,
          metaAppConfigEntity.id,
        );

      return Response.json({
        url: result.statusUrl,
        confirmation_code: result.confirmationCode,
      });
    });

    return route;
  }
}

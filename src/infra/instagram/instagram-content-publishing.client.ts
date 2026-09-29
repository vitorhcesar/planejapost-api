import { AppError } from "@/domain/errors/app.error";
import type {
  IPublishCarouselInput,
  IPublishMediaInput,
  IPublishMediaResult,
} from "@/domain/instagram/instagram-content-publishing.service";

interface IInstagramContainerResponse {
  id?: string;
  error?: {
    message?: string;
  };
}

interface IInstagramPublishResponse {
  id?: string;
  error?: {
    message?: string;
  };
}

interface IInstagramContainerStatusResponse {
  status_code?: string;
  error?: {
    message?: string;
  };
}

interface IInstagramPermalinkResponse {
  permalink?: string;
  error?: {
    message?: string;
  };
}

type InstagramContainerStatusCode =
  | "EXPIRED"
  | "ERROR"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

const CONTAINER_POLL_INTERVAL_MS = 3_000;
const CONTAINER_POLL_MAX_ATTEMPTS = 60;
const VIDEO_URL_PATTERN = /\.(mp4|mov|webm)(\?|$)/i;

export class InstagramContentPublishingClient {
  async publishPost(input: IPublishMediaInput): Promise<IPublishMediaResult> {
    const containerId = await this.createSingleMediaContainer(input.instagramUserId, {
      accessToken: input.accessToken,
      mediaUrl: input.mediaUrl,
      caption: input.caption,
    });

    await this.waitForContainerReady(containerId, input.accessToken);

    return this.publishContainer(input.instagramUserId, {
      accessToken: input.accessToken,
      containerId,
    });
  }

  async publishCarouselPost(
    input: IPublishCarouselInput,
  ): Promise<IPublishMediaResult> {
    if (input.mediaUrls.length < 2) {
      throw new AppError(
        "Carrossel requer ao menos duas mídias",
        400,
        "instagram_carousel_min_items",
      );
    }

    const childContainerIds: string[] = [];

    for (const mediaUrl of input.mediaUrls) {
      const containerId = await this.createCarouselItemContainer(
        input.instagramUserId,
        {
          accessToken: input.accessToken,
          mediaUrl,
        },
      );

      await this.waitForContainerReady(containerId, input.accessToken);
      childContainerIds.push(containerId);
    }

    const carouselContainerId = await this.createCarouselContainer(
      input.instagramUserId,
      {
        accessToken: input.accessToken,
        children: childContainerIds,
        caption: input.caption,
      },
    );

    await this.waitForContainerReady(carouselContainerId, input.accessToken);

    return this.publishContainer(input.instagramUserId, {
      accessToken: input.accessToken,
      containerId: carouselContainerId,
    });
  }

  async publishStory(input: IPublishMediaInput): Promise<IPublishMediaResult> {
    const containerId = await this.createSingleMediaContainer(input.instagramUserId, {
      accessToken: input.accessToken,
      mediaUrl: input.mediaUrl,
      mediaType: "STORIES",
    });

    await this.waitForContainerReady(containerId, input.accessToken);

    return this.publishContainer(input.instagramUserId, {
      accessToken: input.accessToken,
      containerId,
    });
  }

  private isVideoUrl(mediaUrl: string): boolean {
    return VIDEO_URL_PATTERN.test(mediaUrl);
  }

  private async createSingleMediaContainer(
    instagramUserId: string,
    input: {
      accessToken: string;
      mediaUrl: string;
      caption?: string | null;
      mediaType?: "STORIES";
    },
  ): Promise<string> {
    const body = new URLSearchParams({
      access_token: input.accessToken,
    });

    if (this.isVideoUrl(input.mediaUrl)) {
      body.set("media_type", "VIDEO");
      body.set("video_url", input.mediaUrl);
    } else {
      body.set("image_url", input.mediaUrl);
    }

    if (input.caption) {
      body.set("caption", input.caption);
    }

    if (input.mediaType) {
      body.set("media_type", input.mediaType);
    }

    return this.postMediaContainer(instagramUserId, body);
  }

  private async createCarouselItemContainer(
    instagramUserId: string,
    input: {
      accessToken: string;
      mediaUrl: string;
    },
  ): Promise<string> {
    const body = new URLSearchParams({
      access_token: input.accessToken,
      is_carousel_item: "true",
    });

    if (this.isVideoUrl(input.mediaUrl)) {
      body.set("media_type", "VIDEO");
      body.set("video_url", input.mediaUrl);
    } else {
      body.set("image_url", input.mediaUrl);
    }

    return this.postMediaContainer(instagramUserId, body);
  }

  private async createCarouselContainer(
    instagramUserId: string,
    input: {
      accessToken: string;
      children: string[];
      caption?: string | null;
    },
  ): Promise<string> {
    const body = new URLSearchParams({
      access_token: input.accessToken,
      media_type: "CAROUSEL",
      children: input.children.join(","),
    });

    if (input.caption) {
      body.set("caption", input.caption);
    }

    return this.postMediaContainer(instagramUserId, body);
  }

  private async postMediaContainer(
    instagramUserId: string,
    body: URLSearchParams,
  ): Promise<string> {
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${instagramUserId}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const data = (await response.json()) as IInstagramContainerResponse;

    if (!response.ok || !data.id) {
      throw new AppError(
        data.error?.message ?? "Falha ao criar container de mídia no Instagram",
        502,
        "instagram_media_container_failed",
      );
    }

    return data.id;
  }

  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < CONTAINER_POLL_MAX_ATTEMPTS; attempt++) {
      const statusCode = await this.getContainerStatusCode(containerId, accessToken);

      if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
        return;
      }

      if (statusCode === "ERROR") {
        throw new AppError(
          "Falha ao processar mídia no Instagram",
          502,
          "instagram_media_container_processing_failed",
        );
      }

      if (statusCode === "EXPIRED") {
        throw new AppError(
          "O container de mídia expirou antes de ser publicado",
          502,
          "instagram_media_container_expired",
        );
      }

      await this.sleep(CONTAINER_POLL_INTERVAL_MS);
    }

    throw new AppError(
      "Tempo esgotado aguardando processamento da mídia no Instagram",
      504,
      "instagram_media_container_timeout",
    );
  }

  private async getContainerStatusCode(
    containerId: string,
    accessToken: string,
  ): Promise<InstagramContainerStatusCode> {
    const url = new URL(`https://graph.instagram.com/v21.0/${containerId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString());
    const data = (await response.json()) as IInstagramContainerStatusResponse;

    if (!response.ok || !data.status_code) {
      throw new AppError(
        data.error?.message ?? "Falha ao verificar status do container de mídia",
        502,
        "instagram_media_container_status_failed",
      );
    }

    return data.status_code as InstagramContainerStatusCode;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async publishContainer(
    instagramUserId: string,
    input: {
      accessToken: string;
      containerId: string;
    },
  ): Promise<IPublishMediaResult> {
    const body = new URLSearchParams({
      creation_id: input.containerId,
      access_token: input.accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/v21.0/${instagramUserId}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const data = (await response.json()) as IInstagramPublishResponse;

    if (!response.ok || !data.id) {
      throw new AppError(
        data.error?.message ?? "Falha ao publicar mídia no Instagram",
        502,
        "instagram_media_publish_failed",
      );
    }

    const permalink = await this.fetchPermalink(data.id, input.accessToken);

    return {
      instagramMediaId: data.id,
      instagramPermalink: permalink,
    };
  }

  private async fetchPermalink(
    mediaId: string,
    accessToken: string,
  ): Promise<string | null> {
    try {
      const url = new URL(`https://graph.instagram.com/v21.0/${mediaId}`);
      url.searchParams.set("fields", "permalink");
      url.searchParams.set("access_token", accessToken);

      const response = await fetch(url.toString());
      const data = (await response.json()) as IInstagramPermalinkResponse;

      return data.permalink ?? null;
    } catch {
      return null;
    }
  }
}

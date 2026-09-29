import type {
  IInstagramGraphService,
  IInstagramProfile,
} from "@/domain/instagram/instagram.service";
import { AppError } from "@/domain/errors/app.error";

interface IInstagramMeResponse {
  user_id?: string;
  id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  error?: {
    message?: string;
    code?: number;
  };
}

interface IInstagramMediaFieldsResponse {
  media_url?: string;
  thumbnail_url?: string;
  error?: {
    message?: string;
  };
}

export class InstagramGraphClient implements IInstagramGraphService {
  async getProfile(accessToken: string): Promise<IInstagramProfile> {
    const params = new URLSearchParams({
      fields: "user_id,username,name,profile_picture_url",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/v21.0/me?${params.toString()}`,
    );

    const data = (await response.json()) as IInstagramMeResponse;

    if (!response.ok) {
      throw new AppError(
        data.error?.message ?? "Falha ao obter perfil do Instagram",
        502,
        "instagram_profile_fetch_failed",
      );
    }

    const instagramUserId = data.user_id ?? data.id;

    if (!instagramUserId || !data.username) {
      throw new AppError(
        "Resposta inválida ao obter perfil do Instagram",
        502,
        "instagram_profile_invalid_response",
      );
    }

    return {
      instagramUserId,
      username: data.username,
      displayName: data.name ?? null,
      profilePictureUrl: data.profile_picture_url ?? null,
    };
  }

  async getMediaThumbnailUrl(
    mediaId: string,
    accessToken: string,
  ): Promise<string | null> {
    try {
      const url = new URL(`https://graph.instagram.com/v21.0/${mediaId}`);
      url.searchParams.set("fields", "media_url,thumbnail_url");
      url.searchParams.set("access_token", accessToken);

      const response = await fetch(url.toString());
      const data = (await response.json()) as IInstagramMediaFieldsResponse;

      if (!response.ok) return null;

      // thumbnail_url exists for videos/reels; media_url for images
      return data.thumbnail_url ?? data.media_url ?? null;
    } catch {
      return null;
    }
  }
}

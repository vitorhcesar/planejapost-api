import { AppError } from "@/domain/errors/app.error";

export function isAbsoluteMediaUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function assertValidMediaUrls(urls: string[]): string[] {
  const validatedUrls: string[] = [];

  for (const url of urls) {
    if (!isAbsoluteMediaUrl(url)) {
      throw new AppError(
        "URL de mídia inválida. Use URLs públicas retornadas pelo upload.",
        400,
        "invalid_media_url",
      );
    }

    validatedUrls.push(url);
  }

  return validatedUrls;
}

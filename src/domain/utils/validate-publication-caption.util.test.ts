import { describe, expect, it } from "bun:test";
import { AppError } from "@/domain/errors/app.error";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import {
  assertCaptionWithinPlatformLimits,
  X_POST_CAPTION_MAX_LENGTH,
} from "@/domain/utils/validate-publication-caption.util";

describe("assertCaptionWithinPlatformLimits", () => {
  it("allows captions within the X limit", () => {
    expect(() =>
      assertCaptionWithinPlatformLimits({
        caption: "a".repeat(X_POST_CAPTION_MAX_LENGTH),
        platforms: [SocialPlatformEnum.TWITTER],
      }),
    ).not.toThrow();
  });

  it("rejects captions above the X limit", () => {
    try {
      assertCaptionWithinPlatformLimits({
        caption: "a".repeat(X_POST_CAPTION_MAX_LENGTH + 1),
        platforms: [SocialPlatformEnum.TWITTER],
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("caption_too_long_for_platform");
    }
  });

  it("does not enforce X limit for other platforms", () => {
    expect(() =>
      assertCaptionWithinPlatformLimits({
        caption: "a".repeat(500),
        platforms: [SocialPlatformEnum.LINKEDIN],
      }),
    ).not.toThrow();
  });
});

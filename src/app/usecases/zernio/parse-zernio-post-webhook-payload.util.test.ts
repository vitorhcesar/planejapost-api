import { describe, expect, test } from "bun:test";
import {
  extractPlatformPublishedUrl,
  extractPostWebhookPlatformEntries,
  extractZernioAccountId,
  extractZernioPostId,
  extractZernioPublicationIdFromMetadata,
} from "@/app/usecases/zernio/parse-zernio-post-webhook-payload.util";

describe("parse Zernio post webhook payload", () => {
  test("extracts post id from post.id", () => {
    expect(
      extractZernioPostId({
        post: { id: "zernio-post-123" },
      }),
    ).toBe("zernio-post-123");
  });

  test("extracts account id from account block", () => {
    expect(
      extractZernioAccountId({
        account: {
          accountId: "zernio-account-456",
          platform: "instagram",
          username: "isaac.new.cesar",
        },
      }),
    ).toBe("zernio-account-456");
  });

  test("extracts publishedUrl from platform block", () => {
    expect(
      extractPlatformPublishedUrl({
        publishedUrl: "https://instagram.com/p/abc",
      }),
    ).toBe("https://instagram.com/p/abc");
  });

  test("extracts publication id from metadata", () => {
    expect(
      extractZernioPublicationIdFromMetadata({
        post: {
          id: "zernio-post-123",
          metadata: { publicationId: "pub-local-1" },
        },
      }),
    ).toBe("pub-local-1");
  });

  test("parses platforms array from rollup event", () => {
    expect(
      extractPostWebhookPlatformEntries({
        post: {
          id: "zernio-post-123",
          platforms: [
            {
              platform: "instagram",
              status: "published",
              accountId: "acc-1",
              platformPostId: "ig-post-1",
              publishedUrl: "https://instagram.com/p/abc",
            },
          ],
        },
      }),
    ).toEqual([
      {
        accountId: "acc-1",
        platformPostId: "ig-post-1",
        publishedUrl: "https://instagram.com/p/abc",
        status: "published",
        errorMessage: null,
        errorCode: null,
      },
    ]);
  });
});

import { describe, expect, it } from "bun:test";
import { InstagramOAuthClient } from "@/infra/instagram/instagram-oauth.client";

describe("InstagramOAuthClient", () => {
  it("builds authorization URLs from the selected user config", () => {
    const client = new InstagramOAuthClient({
      appId: "987654321",
      appSecret: "not-returned",
      redirectUri:
        "https://api.example.com/api/v1/instagram/connect/callback",
      scopes: ["instagram_business_basic"],
    });

    const url = new URL(client.buildAuthorizationUrl("opaque-state"));

    expect(url.searchParams.get("client_id")).toBe("987654321");
    expect(url.searchParams.get("state")).toBe("opaque-state");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://api.example.com/api/v1/instagram/connect/callback",
    );
  });
});

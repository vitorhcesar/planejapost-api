import { describe, expect, it } from "bun:test";
import {
  resolveLocalPort,
  shouldUseNgrok,
} from "@/infra/dev/ngrok-tunnel.service";

describe("ngrok tunnel helpers", () => {
  it("enables ngrok only when USE_NGROK is true", () => {
    process.env.USE_NGROK = "true";
    expect(shouldUseNgrok()).toBe(true);

    process.env.USE_NGROK = "false";
    expect(shouldUseNgrok()).toBe(false);

    delete process.env.USE_NGROK;
    expect(shouldUseNgrok()).toBe(false);
  });

  it("resolves local port from env", () => {
    process.env.PORT = "9090";
    expect(resolveLocalPort()).toBe(9090);
  });
});

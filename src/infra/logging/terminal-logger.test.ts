import { describe, expect, test } from "bun:test";
import { TerminalLogger } from "@/infra/logging/terminal-logger.service";

describe("TerminalLogger", () => {
  test("formats readable log lines", () => {
    const lines: string[] = [];
    const originalLog = console.log;
    const logger = new TerminalLogger();

    console.log = (...args: unknown[]) => {
      lines.push(String(args[0]));
    };

    try {
      logger.info("Zernio Webhook", "Plataforma atualizada", {
        evento: "post.platform.published",
        publicationId: "pub-1",
        status: "completed",
      });
    } finally {
      console.log = originalLog;
    }

    const output = lines.join("\n");

    expect(output).toContain("Zernio Webhook");
    expect(output).toContain("Plataforma atualizada");
    expect(output).toContain("evento");
    expect(output).toContain("post.platform.published");
    expect(output).not.toContain('"scope"');
  });
});

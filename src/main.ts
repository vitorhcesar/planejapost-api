import { HttpServerBootstrap } from "@/http/bootstrap";
import { TerminalLogger } from "@/infra/logging/terminal-logger.service";

const bootstrap = new HttpServerBootstrap();
const logger = new TerminalLogger();

bootstrap.start().catch((error: unknown) => {
  logger.error("PlanejaPost", "Falha ao iniciar servidor", error);
  process.exit(1);
});

import { HttpServerBootstrap } from "@/http/bootstrap";

const bootstrap = new HttpServerBootstrap();

bootstrap.start().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

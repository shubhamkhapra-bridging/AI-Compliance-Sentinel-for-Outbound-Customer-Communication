import "dotenv/config";
import { createApp } from "./app";
import { logger } from "./middleware/logger";
import { prisma } from "./db/client";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function main() {
  await prisma.$connect();
  logger.info("Database connected");

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info(`API server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV ?? "development"}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Startup failed", err);
  process.exit(1);
});

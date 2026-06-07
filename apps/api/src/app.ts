import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { contactsRouter } from "./routes/contacts";
import { conversationsRouter } from "./routes/conversations";
import { emailsRouter } from "./routes/emails";
import { campaignsRouter } from "./routes/campaigns";
import { templatesRouter } from "./routes/templates";
import { approvalsRouter } from "./routes/approvals";
import { analyticsRouter } from "./routes/analytics";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

export function createApp() {
  const app = express();

  // ─── Security & Parsing ────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_URL ?? "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("combined"));

  // ─── Rate Limiting ─────────────────────────────────────────
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // ─── Health ────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── API v1 Routes ─────────────────────────────────────────
  const v1 = express.Router();
  v1.use("/auth", authRouter);
  v1.use("/products", productsRouter);
  v1.use("/contacts", contactsRouter);
  v1.use("/conversations", conversationsRouter);
  v1.use("/emails", emailsRouter);
  v1.use("/campaigns", campaignsRouter);
  v1.use("/templates", templatesRouter);
  v1.use("/approvals", approvalsRouter);
  v1.use("/analytics", analyticsRouter);

  app.use("/api/v1", v1);

  // ─── Error Handling ────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

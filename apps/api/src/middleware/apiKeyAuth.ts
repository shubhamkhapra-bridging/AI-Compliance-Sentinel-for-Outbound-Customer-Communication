import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/client";
import { hashApiKey } from "../lib/apiKeys";
import { AppError } from "./errorHandler";

// Tenant resolved from an X-API-Key header, used to scope all data access.
export interface TenantContext {
  id: string;
  name: string;
  llmProvider: string | null;
  llmApiKeyEncrypted: string | null;
  llmModel: string | null;
  googleChatWebhookUrl: string | null;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      apiKeyId?: string;
    }
  }
}

// Authenticates external/programmatic callers via a public API key.
// Kept entirely separate from the JWT `authenticate` middleware.
export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  const raw = req.header("x-api-key");
  if (!raw) {
    return next(new AppError(401, "API key required", "MISSING_API_KEY"));
  }

  try {
    const keyHash = hashApiKey(raw);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { tenant: true },
    });

    if (!apiKey || apiKey.revokedAt || !apiKey.tenant.active) {
      return next(new AppError(401, "Invalid or revoked API key", "INVALID_API_KEY"));
    }

    req.tenant = {
      id: apiKey.tenant.id,
      name: apiKey.tenant.name,
      llmProvider: apiKey.tenant.llmProvider,
      llmApiKeyEncrypted: apiKey.tenant.llmApiKeyEncrypted,
      llmModel: apiKey.tenant.llmModel,
      googleChatWebhookUrl: apiKey.tenant.googleChatWebhookUrl,
    };
    req.apiKeyId = apiKey.id;

    // Fire-and-forget last-used update.
    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    next();
  } catch (err) {
    next(err);
  }
}

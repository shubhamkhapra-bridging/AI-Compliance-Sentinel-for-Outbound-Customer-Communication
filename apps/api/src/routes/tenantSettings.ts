import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { encrypt } from "../lib/crypto";
import { generateApiKey } from "../lib/apiKeys";
import { listValidations, validationStats } from "../lib/validationQueries";

// First-party (JWT) management of the logged-in user's Tenant. The browser
// never holds a raw API key; it reaches tenant data through these JWT-scoped
// endpoints. Decrypted LLM keys are never returned to any client.

async function getOrCreateTenant(userId: string, email: string) {
  const existing = await prisma.tenant.findFirst({ where: { ownerUserId: userId } });
  if (existing) return existing;
  return prisma.tenant.create({
    data: { ownerUserId: userId, email, name: email.split("@")[0] || "My workspace" },
  });
}

// ─── Tenant settings + API key management (mounted at /api/v1/tenants) ──
export const tenantSettingsRouter = Router();
tenantSettingsRouter.use(authenticate);

tenantSettingsRouter.get("/settings", async (req, res, next) => {
  try {
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);
    res.json({
      id: tenant.id,
      name: tenant.name,
      llmProvider: tenant.llmProvider,
      llmModel: tenant.llmModel,
      llmKeyConfigured: !!tenant.llmApiKeyEncrypted,
      googleChatWebhookUrl: tenant.googleChatWebhookUrl,
      counters: {
        totalValidations: tenant.totalValidations,
        totalPassed: tenant.totalPassed,
        totalFlagged: tenant.totalFlagged,
      },
    });
  } catch (err) {
    next(err);
  }
});

const settingsSchema = z.object({
  llmProvider: z.string().optional(),
  llmApiKey: z.string().optional(),
  llmModel: z.string().optional(),
  googleChatWebhookUrl: z.string().url().or(z.literal("")).optional(),
});

tenantSettingsRouter.put("/settings", async (req, res, next) => {
  try {
    const body = settingsSchema.parse(req.body);
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);

    const data: Record<string, unknown> = {};
    if (body.llmProvider !== undefined) data.llmProvider = body.llmProvider;
    if (body.llmModel !== undefined) data.llmModel = body.llmModel;
    if (body.googleChatWebhookUrl !== undefined) {
      data.googleChatWebhookUrl = body.googleChatWebhookUrl || null;
    }
    if (body.llmApiKey !== undefined && body.llmApiKey !== "") {
      data.llmApiKeyEncrypted = encrypt(body.llmApiKey);
    }

    const updated = await prisma.tenant.update({ where: { id: tenant.id }, data });
    res.json({
      id: updated.id,
      llmProvider: updated.llmProvider,
      llmModel: updated.llmModel,
      llmKeyConfigured: !!updated.llmApiKeyEncrypted,
      googleChatWebhookUrl: updated.googleChatWebhookUrl,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(400, "Invalid settings", "VALIDATION_ERROR"));
    }
    next(err);
  }
});

tenantSettingsRouter.get("/keys", async (req, res, next) => {
  try {
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, keyPrefix: true, name: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ keys });
  } catch (err) {
    next(err);
  }
});

const createKeySchema = z.object({ name: z.string().min(1).default("API key") });

tenantSettingsRouter.post("/keys", async (req, res, next) => {
  try {
    const { name } = createKeySchema.parse(req.body ?? {});
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);
    const key = generateApiKey();
    const created = await prisma.apiKey.create({
      data: { tenantId: tenant.id, keyHash: key.hash, keyPrefix: key.prefix, name },
    });
    res.status(201).json({ id: created.id, prefix: created.keyPrefix, name, apiKey: key.plaintext });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(400, "Invalid request", "VALIDATION_ERROR"));
    }
    next(err);
  }
});

tenantSettingsRouter.delete("/keys/:id", async (req, res, next) => {
  try {
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, tenantId: tenant.id } });
    if (!key) throw new AppError(404, "API key not found", "NOT_FOUND");
    await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    res.json({ id: key.id, revoked: true });
  } catch (err) {
    next(err);
  }
});

// ─── Validations dashboard (mounted at /api/v1/validations) ─────────────
export const validationsRouter = Router();
validationsRouter.use(authenticate);

validationsRouter.get("/", async (req, res, next) => {
  try {
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    res.json(await listValidations(tenant.id, limit, offset));
  } catch (err) {
    next(err);
  }
});

validationsRouter.get("/stats", async (req, res, next) => {
  try {
    const tenant = await getOrCreateTenant(req.user!.userId, req.user!.email);
    res.json(await validationStats(tenant.id));
  } catch (err) {
    next(err);
  }
});

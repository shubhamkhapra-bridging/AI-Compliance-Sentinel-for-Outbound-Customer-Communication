import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db/client";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { AppError } from "../middleware/errorHandler";
import { decrypt } from "../lib/crypto";
import { notifyGoogleChat, ValidationIssue } from "../lib/googleChat";
import { listValidations, validationStats } from "../lib/validationQueries";

export const validateRouter = Router();
validateRouter.use(apiKeyAuth);

const validateSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  llmApiKey: z.string().optional(),
  model: z.string().optional(),
});

interface AgentResult {
  passed: boolean;
  riskScore: number;
  issues: ValidationIssue[];
  correctedSubject: string;
  correctedBody: string;
  usage?: { provider?: string; model?: string; input_tokens?: number; output_tokens?: number };
}

// POST /v1/validate — validate an email before sending.
validateRouter.post("/", async (req, res, next) => {
  try {
    const { subject, body, llmApiKey, model } = validateSchema.parse(req.body);
    const tenant = req.tenant!;

    // Resolve LLM key: per-request override wins, else the tenant's stored key.
    let resolvedKey = llmApiKey;
    if (!resolvedKey && tenant.llmApiKeyEncrypted) {
      resolvedKey = decrypt(tenant.llmApiKeyEncrypted);
    }
    if (!resolvedKey) {
      throw new AppError(400, "No LLM API key configured for this tenant", "NO_LLM_KEY");
    }

    const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
    const agentKey = process.env.AI_AGENTS_API_KEY ?? "";

    let result: AgentResult;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const agentRes = await fetch(`${agentsUrl}/agents/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": agentKey },
        body: JSON.stringify({
          subject,
          body,
          llmApiKey: resolvedKey,
          provider: tenant.llmProvider ?? undefined,
          model: model ?? tenant.llmModel ?? undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!agentRes.ok) throw new AppError(502, "Validation service error", "UPSTREAM_ERROR");
      result = (await agentRes.json()) as AgentResult;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, "Validation service unavailable", "UPSTREAM_UNAVAILABLE");
    }

    const issues = result.issues ?? [];
    const passed = !!result.passed;

    // Notify Google Chat on failure (fault-tolerant — never blocks the response).
    let notified = false;
    if (!passed && tenant.googleChatWebhookUrl) {
      notified = await notifyGoogleChat(tenant.googleChatWebhookUrl, {
        subject,
        issues,
        correctedSubject: result.correctedSubject,
        correctedBody: result.correctedBody,
      });
    }

    // Persist the result (store a hash of the body, not the raw body).
    const record = await prisma.emailValidation.create({
      data: {
        tenantId: tenant.id,
        apiKeyId: req.apiKeyId,
        subject,
        bodyHash: crypto.createHash("sha256").update(body).digest("hex"),
        bodyPreview: body.slice(0, 280),
        passed,
        riskScore: result.riskScore ?? 0,
        issues: issues as object,
        correctedSubject: result.correctedSubject,
        correctedBody: result.correctedBody,
        notified,
        llmProvider: result.usage?.provider,
        llmModel: result.usage?.model,
        inputTokens: result.usage?.input_tokens ?? 0,
        outputTokens: result.usage?.output_tokens ?? 0,
      },
    });

    // Bump tenant counters.
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        totalValidations: { increment: 1 },
        totalPassed: { increment: passed ? 1 : 0 },
        totalFlagged: { increment: passed ? 0 : 1 },
      },
    });

    res.json({
      id: record.id,
      passed,
      riskScore: result.riskScore ?? 0,
      issues,
      corrected: { subject: result.correctedSubject, body: result.correctedBody },
      notified,
      usage: result.usage,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(400, "Invalid request body", "VALIDATION_ERROR"));
    }
    next(err);
  }
});

// GET /v1/validate/validations — list this tenant's validations.
validateRouter.get("/validations", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    res.json(await listValidations(req.tenant!.id, limit, offset));
  } catch (err) {
    next(err);
  }
});

// GET /v1/validate/stats — aggregate pass/flag stats for this tenant.
validateRouter.get("/stats", async (req, res, next) => {
  try {
    res.json(await validationStats(req.tenant!.id));
  } catch (err) {
    next(err);
  }
});

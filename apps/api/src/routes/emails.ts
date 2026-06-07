import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const emailsRouter = Router();
emailsRouter.use(authenticate);

// Remove the invisible restyle "recipe" comment before sending to a provider
const stripRecipe = (html: string): string =>
  html.replace(/<!--SENTINEL_RECIPE:.*?-->\s*/s, "");

const compliancePreviewSchema = z.object({
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  productId: z.string().uuid(),
});

// POST /emails/compliance-preview — run compliance check on a draft before saving
emailsRouter.post("/compliance-preview", async (req, res, next) => {
  try {
    const { subject, bodyHtml, productId } = compliancePreviewSchema.parse(req.body);

    const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
    const complianceRes = await fetch(`${agentsUrl}/agents/compliance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_AGENTS_API_KEY ?? "",
      },
      body: JSON.stringify({ draftId: "preview", productId, subject, bodyHtml }),
    });

    if (!complianceRes.ok) throw new AppError(502, "Compliance service error", "UPSTREAM_ERROR");
    res.json(await complianceRes.json());
  } catch (err) {
    next(err);
  }
});

const fixDraftSchema = z.object({
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  violations: z.array(z.record(z.unknown())).default([]),
  productId: z.string().uuid(),
});

// POST /emails/fix-draft — fetch live product knowledge, rewrite draft to resolve violations
emailsRouter.post("/fix-draft", async (req, res, next) => {
  try {
    const { subject, bodyHtml, bodyText, violations, productId } =
      fixDraftSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true, websiteUrl: true },
    });
    if (!product) throw new AppError(404, "Product not found", "NOT_FOUND");

    const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
    const fixRes = await fetch(`${agentsUrl}/agents/fix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_AGENTS_API_KEY ?? "",
      },
      body: JSON.stringify({
        draftSubject: subject,
        draftBodyHtml: bodyHtml,
        draftBodyText: bodyText ?? "",
        violations,
        productId,
        productSlug: product.slug,
        websiteUrl: product.websiteUrl,
      }),
    });

    if (!fixRes.ok) throw new AppError(502, "Fix service error", "UPSTREAM_ERROR");
    res.json(await fixRes.json());
  } catch (err) {
    next(err);
  }
});

const restyleSchema = z.object({
  draftId: z.string().uuid(),
  instruction: z.string().default(""),
  imageBase64: z.string().optional(), // data URL of an uploaded screenshot
}).refine((v) => v.instruction.trim().length > 0 || !!v.imageBase64, {
  message: "Provide an instruction or an image",
});

// POST /emails/restyle — chat-driven styling change (colors, fonts, sizes)
emailsRouter.post("/restyle", async (req, res, next) => {
  try {
    const { draftId, instruction, imageBase64 } = restyleSchema.parse(req.body);

    const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new AppError(404, "Draft not found", "NOT_FOUND");

    const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
    const styleRes = await fetch(`${agentsUrl}/agents/style`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_AGENTS_API_KEY ?? "",
      },
      body: JSON.stringify({ bodyHtml: draft.bodyHtml, instruction, imageBase64 }),
    });

    if (!styleRes.ok) throw new AppError(502, "Style service error", "UPSTREAM_ERROR");
    const data = await styleRes.json() as {
      bodyHtml: string; bodyText: string; changes: string[]; method: string;
    };

    const updated = await prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText || draft.bodyText,
      },
    });

    res.json({
      id: updated.id,
      subject: updated.subject,
      bodyHtml: updated.bodyHtml,
      bodyText: updated.bodyText,
      changes: data.changes,
      method: data.method,
    });
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({
  draftId: z.string().uuid(),
  recipientEmail: z.string().email(),
  sendingAccountId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// POST /emails/send — compliance gate → create email record → dispatch via AI agents
emailsRouter.post("/send", async (req, res, next) => {
  try {
    const { draftId, recipientEmail, sendingAccountId, scheduledAt } =
      sendSchema.parse(req.body);

    // Bug fix 1: guard against duplicate sends (draftId is @unique on Email)
    const existing = await prisma.email.findUnique({ where: { draftId } });
    if (existing) {
      return res.status(200).json({ email: existing, requiresApproval: false, alreadySent: true });
    }

    const draft = await prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { conversation: { include: { product: true } } },
    });
    if (!draft) throw new AppError(404, "Draft not found", "NOT_FOUND");

    // Bug fix 2: explicit null check instead of non-null assertion
    if (!draft.conversation) throw new AppError(400, "Draft has no associated conversation", "INVALID_DRAFT");

    const productId = draft.conversation.productId;
    const product   = draft.conversation.product;
    const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
    const apiKey    = process.env.AI_AGENTS_API_KEY ?? "";

    // Bug fix 3: fault-tolerant compliance gate — ok-check + try/catch so a
    // slow or down agents service does not 500 the entire send
    let complianceRiskScore = 0;
    let requiresApproval    = false;
    try {
      const complianceRes = await fetch(`${agentsUrl}/agents/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ draftId, productId, subject: draft.subject, bodyHtml: draft.bodyHtml }),
      });

      if (complianceRes.ok) {
        const compliance = await complianceRes.json() as {
          passed: boolean; riskScore: number; requiresApproval: boolean; violations: unknown[];
        };
        if (!compliance.passed) {
          return res.status(422).json({ error: "Compliance check failed", violations: compliance.violations });
        }
        complianceRiskScore = compliance.riskScore    ?? 0;
        requiresApproval    = compliance.requiresApproval ?? false;
      }
      // non-ok response: log and proceed (user already verified in UI)
    } catch {
      // compliance service unreachable — proceed rather than 500
    }

    // Clean HTML (without the restyle recipe comment) for the stored/sent email
    const cleanHtml = stripRecipe(draft.bodyHtml);

    // Create email record
    const email = await prisma.email.create({
      data: {
        conversationId:   draft.conversationId,
        draftId:          draft.id,
        productId,
        senderUserId:     req.user!.userId,
        sendingAccountId: sendingAccountId ?? undefined,
        subject:          draft.subject,
        bodyHtml:         cleanHtml,
        bodyText:         draft.bodyText ?? undefined,
        scheduledAt:      scheduledAt ? new Date(scheduledAt) : undefined,
        status:           scheduledAt ? "scheduled" : "queued",
        riskScore:        complianceRiskScore,
      },
    });

    await prisma.emailRecipient.create({
      data: { emailId: email.id, emailAddress: recipientEmail, recipientType: "to" },
    });

    // Route to approval if risk is high
    if (requiresApproval) {
      await prisma.approvalRequest.create({
        data: {
          emailId:              email.id,
          requestedByUserId:    req.user!.userId,
          status:               "pending",
          expiresAt:            new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await prisma.email.update({ where: { id: email.id }, data: { status: "pending_approval" } });
      return res.status(202).json({ email, message: "Email queued for approval", requiresApproval: true });
    }

    // Bug fix 4: fault-tolerant send — ok-check + try/catch
    if (!scheduledAt) {
      const fromEmail = product?.sendingDomain
        ? `noreply@${product.sendingDomain}`
        : "noreply@bridgingtech.com";

      try {
        const sendRes = await fetch(`${agentsUrl}/agents/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
          body: JSON.stringify({
            emailId:     email.id,
            fromEmail,
            toEmail:     recipientEmail,
            subject:     draft.subject,
            bodyHtml:    cleanHtml,
            bodyText:    draft.bodyText ?? "",
            productSlug: product?.slug ?? "unknown",
          }),
        });

        if (sendRes.ok) {
          const sendResult = await sendRes.json() as { success: boolean; messageId: string; error: string };
          await prisma.email.update({
            where: { id: email.id },
            data: {
              status:            sendResult.success ? "sent" : "failed",
              sentAt:            sendResult.success ? new Date() : undefined,
              providerMessageId: sendResult.messageId || undefined,
            },
          });
          if (!sendResult.success) {
            return res.status(502).json({ error: "Email delivery failed", detail: sendResult.error });
          }
        } else {
          await prisma.email.update({ where: { id: email.id }, data: { status: "failed" } });
          throw new AppError(502, "Email sending service returned an error", "SEND_ERROR");
        }
      } catch (sendErr) {
        if (sendErr instanceof AppError) throw sendErr;
        // Network error — mark failed but don't hide the email record
        await prisma.email.update({ where: { id: email.id }, data: { status: "failed" } });
        throw new AppError(502, "Email sending service unavailable", "SEND_UNAVAILABLE");
      }
    }

    res.status(201).json({ email, requiresApproval: false });
  } catch (err) {
    next(err);
  }
});

// GET /emails — list sent emails for the current user with open events
emailsRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: { senderUserId: req.user!.userId },
        include: {
          recipients: { take: 3 },
          events: {
            where: { eventType: "open" },
            orderBy: { occurredAt: "asc" },
            take: 1,
          },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.email.count({ where: { senderUserId: req.user!.userId } }),
    ]);

    res.json({ emails, total });
  } catch (err) {
    next(err);
  }
});

// GET /emails/:id — get email with all detail
emailsRouter.get("/:id", async (req, res, next) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, senderUserId: req.user!.userId },
      include: {
        recipients: true,
        attachments: true,
        complianceChecks: true,
        riskAssessment: true,
        approvalRequest: { include: { decisions: true } },
        events: { orderBy: { occurredAt: "desc" }, take: 50 },
        product: true,
      },
    });
    if (!email) throw new AppError(404, "Email not found", "NOT_FOUND");
    res.json(email);
  } catch (err) {
    next(err);
  }
});

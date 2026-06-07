import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const emailsRouter = Router();
emailsRouter.use(authenticate);

const sendSchema = z.object({
  draftId: z.string().uuid(),
  sendingAccountId: z.string().uuid(),
  scheduledAt: z.string().datetime().optional(),
});

// POST /emails/send — run compliance + risk, then send or queue for approval
emailsRouter.post("/send", async (req, res, next) => {
  try {
    const { draftId, sendingAccountId, scheduledAt } = sendSchema.parse(
      req.body
    );

    const draft = await prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { conversation: { include: { product: true } } },
    });
    if (!draft) throw new AppError(404, "Draft not found", "NOT_FOUND");

    // 1. Run compliance check via AI agents service
    const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
    const complianceRes = await fetch(`${agentsUrl}/agents/compliance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_AGENTS_API_KEY ?? "",
      },
      body: JSON.stringify({
        draftId,
        productId: draft.conversation?.productId,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
      }),
    });
    const compliance = await complianceRes.json();

    if (!compliance.passed) {
      return res.status(422).json({
        error: "Compliance check failed",
        violations: compliance.violations,
      });
    }

    // 2. Create email record
    const email = await prisma.email.create({
      data: {
        conversationId: draft.conversationId,
        draftId: draft.id,
        productId: draft.conversation!.productId,
        senderUserId: req.user!.userId,
        sendingAccountId,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        bodyText: draft.bodyText ?? undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: scheduledAt ? "scheduled" : "queued",
        riskScore: compliance.riskScore,
      },
    });

    // 3. Route to approval if risk is high
    if (compliance.requiresApproval) {
      await prisma.approvalRequest.create({
        data: {
          emailId: email.id,
          requestedByUserId: req.user!.userId,
          status: "pending",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "pending_approval" },
      });
      return res.status(202).json({
        email,
        message: "Email queued for approval",
        requiresApproval: true,
      });
    }

    res.status(201).json({ email, requiresApproval: false });
  } catch (err) {
    next(err);
  }
});

// GET /emails/:id — get email with recipients, events, compliance checks
emailsRouter.get("/:id", async (req, res, next) => {
  try {
    const email = await prisma.email.findUnique({
      where: { id: req.params.id },
      include: {
        recipients: true,
        attachments: true,
        complianceChecks: true,
        riskAssessment: true,
        approvalRequest: { include: { decisions: true } },
        events: { orderBy: { occurredAt: "desc" }, take: 50 },
      },
    });
    if (!email) throw new AppError(404, "Email not found", "NOT_FOUND");
    res.json(email);
  } catch (err) {
    next(err);
  }
});

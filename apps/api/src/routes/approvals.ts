import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const approvalsRouter = Router();
approvalsRouter.use(authenticate);

approvalsRouter.get("/pending", async (req, res, next) => {
  try {
    const requests = await prisma.approvalRequest.findMany({
      where: {
        assignedApproverUserId: req.user!.userId,
        status: "pending",
      },
      include: {
        email: { include: { product: true, riskAssessment: true } },
        requestedBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

const decideSchema = z.object({
  decision: z.enum(["approved", "rejected", "requested_changes"]),
  comments: z.string().optional(),
});

approvalsRouter.post("/:id/decide", async (req, res, next) => {
  try {
    const { decision, comments } = decideSchema.parse(req.body);

    const request = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) throw new AppError(404, "Approval request not found", "NOT_FOUND");

    const [updated, decisionRecord] = await prisma.$transaction([
      prisma.approvalRequest.update({
        where: { id: req.params.id },
        data: { status: decision, decidedAt: new Date() },
      }),
      prisma.approvalDecision.create({
        data: {
          approvalRequestId: req.params.id,
          decidedByUserId: req.user!.userId,
          decision,
          comments,
        },
      }),
      ...(decision === "approved"
        ? [
            prisma.email.update({
              where: { id: request.emailId },
              data: { status: "queued" },
            }),
          ]
        : []),
    ]);

    res.json({ request: updated, decision: decisionRecord });
  } catch (err) {
    next(err);
  }
});

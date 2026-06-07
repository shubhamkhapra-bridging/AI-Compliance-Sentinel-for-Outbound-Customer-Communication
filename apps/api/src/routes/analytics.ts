import { Router } from "express";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

analyticsRouter.get("/overview", async (_req, res, next) => {
  try {
    const [totalEmails, totalContacts, pendingApprovals, llmCostToday] =
      await Promise.all([
        prisma.email.count(),
        prisma.contactSynced.count(),
        prisma.approvalRequest.count({ where: { status: "pending" } }),
        prisma.llmUsageAggregate.aggregate({
          where: { usageDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          _sum: { totalCostUsd: true },
        }),
      ]);

    res.json({
      totalEmails,
      totalContacts,
      pendingApprovals,
      llmCostToday: llmCostToday._sum.totalCostUsd ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/llm-usage", async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 7);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usage = await prisma.llmUsageAggregate.groupBy({
      by: ["usageDate", "agentType", "llmProvider"],
      where: { usageDate: { gte: since } },
      _sum: { totalCostUsd: true, totalCalls: true, totalInputTokens: true, totalOutputTokens: true },
      orderBy: { usageDate: "asc" },
    });

    res.json(usage);
  } catch (err) {
    next(err);
  }
});

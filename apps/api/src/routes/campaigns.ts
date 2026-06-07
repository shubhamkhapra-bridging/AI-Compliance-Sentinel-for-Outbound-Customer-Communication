import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const campaignsRouter = Router();
campaignsRouter.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  productId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  segmentId: z.string().uuid().optional(),
  scheduledSendAt: z.string().datetime().optional(),
});

campaignsRouter.get("/", async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { createdById: req.user!.userId },
      include: { product: true, template: true, segment: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const campaign = await prisma.campaign.create({
      data: { ...data, createdById: req.user!.userId },
    });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.get("/:id/stats", async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { recipients: true } },
      },
    });
    if (!campaign) throw new AppError(404, "Campaign not found", "NOT_FOUND");

    const recipientStats = await prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: req.params.id },
      _count: true,
    });

    res.json({ campaign, recipientStats });
  } catch (err) {
    next(err);
  }
});

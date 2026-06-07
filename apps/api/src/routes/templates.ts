import { Router } from "express";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";

export const templatesRouter = Router();
templatesRouter.use(authenticate);

templatesRouter.get("/", async (req, res, next) => {
  try {
    const { productId } = req.query;
    const templates = await prisma.emailTemplate.findMany({
      where: { active: true, ...(productId ? { productId: String(productId) } : {}) },
      include: {
        performance: { orderBy: { periodStart: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

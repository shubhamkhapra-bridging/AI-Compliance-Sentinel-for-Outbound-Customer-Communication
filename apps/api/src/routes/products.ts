import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const productsRouter = Router();
productsRouter.use(authenticate);

const createProductSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  websiteUrl: z.string().url().optional(),
  sendingDomain: z.string().optional(),
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { brandKit: true },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { brandKit: true, complianceRules: true },
    });
    if (!product) throw new AppError(404, "Product not found", "NOT_FOUND");
    res.json(product);
  } catch (err) {
    next(err);
  }
});

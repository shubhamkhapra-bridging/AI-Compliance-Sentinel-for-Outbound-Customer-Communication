import { Router } from "express";
import { prisma } from "../db/client";
import { authenticate, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const productsRouter = Router();
productsRouter.use(authenticate);

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

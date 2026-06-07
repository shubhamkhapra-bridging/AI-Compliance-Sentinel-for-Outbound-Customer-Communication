import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const templatesRouter = Router();
templatesRouter.use(authenticate);

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  productId: z.string().uuid(),
  subjectTemplate: z.string().min(1),
  bodyHtmlTemplate: z.string().min(1),
  bodyTextTemplate: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ productId: true, slug: true });

// GET /templates — list all (optionally filter by productId)
templatesRouter.get("/", async (req, res, next) => {
  try {
    const { productId } = req.query;
    const templates = await prisma.emailTemplate.findMany({
      where: {
        active: true,
        deletedAt: null,
        ...(productId ? { productId: String(productId) } : {}),
      },
      include: {
        performance: { orderBy: { periodStart: "desc" }, take: 1 },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

// GET /templates/:id — get single template with versions
templatesRouter.get("/:id", async (req, res, next) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 5 },
        performance: { orderBy: { periodStart: "desc" }, take: 1 },
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!template) throw new AppError(404, "Template not found", "NOT_FOUND");
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// POST /templates — create new HTML email template
templatesRouter.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new AppError(404, "Product not found", "NOT_FOUND");

    const template = await prisma.emailTemplate.create({
      data: {
        slug: data.slug,
        name: data.name,
        category: data.category,
        productId: data.productId,
        subjectTemplate: data.subjectTemplate,
        bodyHtmlTemplate: data.bodyHtmlTemplate,
        bodyTextTemplate: data.bodyTextTemplate,
        createdById: req.user!.userId,
      },
    });

    // Save initial version snapshot
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        subjectTemplate: template.subjectTemplate,
        bodyHtmlTemplate: template.bodyHtmlTemplate,
        changelog: "Initial version",
        isCurrent: true,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

// PUT /templates/:id — update template (creates a new version snapshot)
templatesRouter.put("/:id", async (req, res, next) => {
  try {
    const updates = updateSchema.parse(req.body);

    const existing = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!existing) throw new AppError(404, "Template not found", "NOT_FOUND");

    const updated = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: { ...updates, updatedAt: new Date() },
    });

    // Snapshot new version if HTML or subject changed
    if (updates.bodyHtmlTemplate || updates.subjectTemplate) {
      const lastVersion = existing.versions[0]?.versionNumber ?? 0;
      await prisma.templateVersion.updateMany({
        where: { templateId: existing.id, isCurrent: true },
        data: { isCurrent: false },
      });
      await prisma.templateVersion.create({
        data: {
          templateId: existing.id,
          versionNumber: lastVersion + 1,
          subjectTemplate: updates.subjectTemplate ?? existing.subjectTemplate,
          bodyHtmlTemplate: updates.bodyHtmlTemplate ?? existing.bodyHtmlTemplate,
          changelog: req.body.changelog ?? "Updated",
          isCurrent: true,
          createdById: req.user!.userId,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /templates/:id — soft delete
templatesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Template not found", "NOT_FOUND");

    await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), active: false },
    });
    res.json({ message: "Template deleted" });
  } catch (err) {
    next(err);
  }
});

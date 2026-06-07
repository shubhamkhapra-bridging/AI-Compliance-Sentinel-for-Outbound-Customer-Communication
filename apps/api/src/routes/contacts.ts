import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";

export const contactsRouter = Router();
contactsRouter.use(authenticate);

const querySchema = z.object({
  productId: z.string().uuid().optional(),
  search: z.string().optional(),
  leadStage: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

contactsRouter.get("/", async (req, res, next) => {
  try {
    const { productId, search, leadStage, page, limit } = querySchema.parse(
      req.query
    );

    const where = {
      ...(productId && { productId }),
      ...(leadStage && { leadStage }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { companyName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      prisma.contactSynced.findMany({
        where,
        include: { historyCache: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.contactSynced.count({ where }),
    ]);

    res.json({ contacts, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

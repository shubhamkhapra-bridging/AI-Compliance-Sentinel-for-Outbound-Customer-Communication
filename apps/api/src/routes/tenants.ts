import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { generateApiKey } from "../lib/apiKeys";

export const tenantsRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// POST /v1/tenants/register — self-service tenant registration.
// Returns the initial API key plaintext exactly once.
tenantsRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email } = registerSchema.parse(req.body);

    const existing = await prisma.tenant.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "A tenant with this email already exists", "TENANT_EXISTS");
    }

    const key = generateApiKey();
    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        apiKeys: {
          create: { keyHash: key.hash, keyPrefix: key.prefix, name: "Default key" },
        },
      },
    });

    res.status(201).json({
      tenantId: tenant.id,
      name: tenant.name,
      email: tenant.email,
      apiKey: key.plaintext, // shown once — store it now
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(400, "Invalid request body", "VALIDATION_ERROR"));
    }
    next(err);
  }
});

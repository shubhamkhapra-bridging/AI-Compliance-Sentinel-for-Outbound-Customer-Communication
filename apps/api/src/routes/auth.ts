import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    // In production: check hashed password from a separate credentials table
    // For SSO flow, validate via provider token instead
    const isValid = await bcrypt.compare(
      password,
      (user as any).passwordHash ?? ""
    );
    if (!isValid) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name);

    const token = jwt.sign(
      { userId: user.id, email: user.email, roles },
      process.env.JWT_SECRET ?? "fallback-secret",
      { expiresIn: process.env.JWT_EXPIRES_IN ?? "24h" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        roles: { include: { role: true } },
        teams: { include: { team: true } },
      },
    });
    if (!user) throw new AppError(404, "User not found", "NOT_FOUND");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

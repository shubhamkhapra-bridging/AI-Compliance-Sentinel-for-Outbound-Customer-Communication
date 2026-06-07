import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const conversationsRouter = Router();
conversationsRouter.use(authenticate);

const createSchema = z.object({
  productId: z.string().uuid(),
  recipientContactId: z.string().uuid().optional(),
  initialMessage: z.string().min(1),
});

// POST /conversations — start a new AI chat session
conversationsRouter.post("/", async (req, res, next) => {
  try {
    const { productId, recipientContactId, initialMessage } =
      createSchema.parse(req.body);

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.userId,
        productId,
        recipientContactId,
        messages: {
          create: {
            role: "user",
            content: initialMessage,
          },
        },
      },
      include: { messages: true },
    });

    // Kick off AI draft generation asynchronously
    generateDraft(conversation.id, initialMessage, productId).catch(
      console.error
    );

    res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
});

// GET /conversations/:id — fetch full conversation with messages and latest draft
conversationsRouter.get("/:id", async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        drafts: { where: { isCurrent: true }, take: 1 },
        product: true,
        contact: true,
      },
    });
    if (!conversation)
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// POST /conversations/:id/messages — send a follow-up message (refinement)
const messageSchema = z.object({ content: z.string().min(1) });

conversationsRouter.post("/:id/messages", async (req, res, next) => {
  try {
    const { content } = messageSchema.parse(req.body);

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { messages: true, product: true },
    });
    if (!conversation)
      throw new AppError(404, "Conversation not found", "NOT_FOUND");

    const message = await prisma.conversationMessage.create({
      data: { conversationId: conversation.id, role: "user", content },
    });

    generateDraft(
      conversation.id,
      content,
      conversation.productId
    ).catch(console.error);

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

// Stub — real implementation calls ai-agents service
async function generateDraft(
  conversationId: string,
  userMessage: string,
  productId: string
) {
  const agentsUrl = process.env.AI_AGENTS_URL ?? "http://localhost:8000";
  const response = await fetch(`${agentsUrl}/agents/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.AI_AGENTS_API_KEY ?? "",
    },
    body: JSON.stringify({ conversationId, userMessage, productId }),
  });
  if (!response.ok) throw new Error(`AI agents error: ${response.status}`);
}

export type EmailStatus =
  | "queued"
  | "scheduled"
  | "pending_approval"
  | "sent"
  | "delivered"
  | "failed";

export type RiskTier = "low" | "medium" | "high";

export interface Email {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  status: EmailStatus;
  riskScore?: number;
  sentAt?: string;
  createdAt: string;
}

export interface EmailDraft {
  id: string;
  conversationId: string;
  version: number;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  isCurrent: boolean;
  llmProvider?: string;
  llmModel?: string;
  llmCostUsd: number;
}

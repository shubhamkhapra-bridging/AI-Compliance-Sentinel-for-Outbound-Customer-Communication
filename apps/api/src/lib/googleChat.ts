import { logger } from "../middleware/logger";

export interface ValidationIssue {
  type: string;
  what: string;
  why: string;
  howToFix: string;
  severity: string;
}

interface NotifyPayload {
  subject: string;
  issues: ValidationIssue[];
  correctedSubject?: string | null;
  correctedBody?: string | null;
}

// Posts a flagged-email summary to a tenant's Google Chat space via an
// incoming webhook. Fault-tolerant: a notification failure must never fail the
// validation request, and secrets/content are never logged.
export async function notifyGoogleChat(
  webhookUrl: string,
  payload: NotifyPayload
): Promise<boolean> {
  try {
    const issueLines = payload.issues
      .map(
        (i, idx) =>
          `*${idx + 1}. [${i.severity.toUpperCase()} · ${i.type}]* ${i.what}\n` +
          `   • *Why:* ${i.why}\n` +
          `   • *How to fix:* ${i.howToFix}`
      )
      .join("\n");

    const corrected =
      payload.correctedSubject || payload.correctedBody
        ? `\n\n*✅ Suggested correction*\n*Subject:* ${payload.correctedSubject ?? "(unchanged)"}\n${
            payload.correctedBody ?? ""
          }`
        : "";

    const text =
      `⚠️ *Email flagged before send*\n*Original subject:* ${payload.subject}\n\n` +
      `*Issues found (${payload.issues.length})*\n${issueLines}${corrected}`;

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      logger.warn("google_chat_notify_failed", { status: res.status });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("google_chat_notify_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

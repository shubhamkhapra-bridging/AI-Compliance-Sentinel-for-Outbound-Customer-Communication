import type {
  ValidateEmailInput,
  ValidationResult,
  ValidationStats,
  ValidationList,
} from "./types";

export interface SentinelClientOptions {
  /** Your tenant API key (sk_live_...). */
  apiKey: string;
  /** Base URL of the validation API. Defaults to the local API gateway. */
  baseUrl?: string;
  /** Optional fetch implementation (for non-global-fetch runtimes). */
  fetch?: typeof fetch;
}

export class SentinelError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "SentinelError";
  }
}

/**
 * Client for the AI Compliance Sentinel email-validation API.
 *
 * ```ts
 * const client = new SentinelClient({ apiKey: "sk_live_..." });
 * const result = await client.validateEmail({ subject, body });
 * if (!result.passed) console.log(result.issues, result.corrected);
 * ```
 */
export class SentinelClient {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(opts: SentinelClientOptions) {
    if (!opts.apiKey) throw new Error("SentinelClient requires an apiKey");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "http://localhost:4000/v1").replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("No fetch implementation available; pass one via options.fetch");
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data as { error?: { message?: string; code?: string } }).error;
      throw new SentinelError(res.status, err?.message ?? "Request failed", err?.code);
    }
    return data as T;
  }

  /** Validate an email for harmful words, spam triggers, and correctness. */
  validateEmail(input: ValidateEmailInput): Promise<ValidationResult> {
    return this.request<ValidationResult>("POST", "/validate", input);
  }

  /** List past validations for this tenant. */
  listValidations(params: { limit?: number; offset?: number } = {}): Promise<ValidationList> {
    const q = new URLSearchParams();
    if (params.limit != null) q.set("limit", String(params.limit));
    if (params.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return this.request<ValidationList>("GET", `/validate/validations${qs ? `?${qs}` : ""}`);
  }

  /** Aggregate pass/flag statistics for this tenant. */
  getStats(): Promise<ValidationStats> {
    return this.request<ValidationStats>("GET", "/validate/stats");
  }
}

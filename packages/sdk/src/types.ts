export interface ValidationIssue {
  type: "harmful" | "spam" | "correctness" | string;
  what: string;
  why: string;
  howToFix?: string;
  severity: "low" | "medium" | "high" | string;
}

export interface ValidationResult {
  id: string;
  passed: boolean;
  riskScore: number;
  issues: ValidationIssue[];
  corrected: { subject: string; body: string };
  notified: boolean;
  usage?: {
    provider?: string;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface ValidateEmailInput {
  subject: string;
  body: string;
  /** Override the tenant's stored LLM key for this request. */
  llmApiKey?: string;
  /** Override the tenant's default model for this request. */
  model?: string;
}

export interface ValidationStats {
  total: number;
  passed: number;
  flagged: number;
  passRate: number;
  series: { date: string; passed: number; flagged: number }[];
}

export interface ValidationListItem {
  id: string;
  subject: string;
  passed: boolean;
  riskScore: number;
  issues: ValidationIssue[];
  correctedSubject: string | null;
  correctedBody: string | null;
  createdAt: string;
}

export interface ValidationList {
  validations: ValidationListItem[];
  total: number;
}

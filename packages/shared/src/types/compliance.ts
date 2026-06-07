export type Regulation = "FDCPA" | "HIPAA" | "PCI-DSS" | "GDPR" | "CAN-SPAM";

export interface ComplianceViolation {
  rule: string;
  severity: "low" | "medium" | "high";
  description: string;
  suggestion?: string;
}

export interface ComplianceResult {
  passed: boolean;
  riskScore: number;
  requiresApproval: boolean;
  violations: ComplianceViolation[];
  recommendations: string[];
}

from pydantic import BaseModel, ConfigDict, Field


class EmailDraft(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    subject: str = ""
    body_html: str = Field(default="", alias="bodyHtml")
    body_text: str = Field(default="", alias="bodyText")


class ComplianceViolation(BaseModel):
    rule: str
    severity: str  # low | medium | high
    description: str
    suggestion: str = ""


class ComplianceReport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    passed: bool
    risk_score: int = Field(default=0, alias="riskScore")
    requires_approval: bool = Field(default=False, alias="requiresApproval")
    violations: list[ComplianceViolation] = []
    recommendations: list[str] = []
    usage: dict = {}


class DeliverabilityReport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    score: int  # 0-100; higher = better
    inbox_prediction: str = Field(default="unknown", alias="inboxPrediction")  # primary | promotions | spam
    warnings: list[str] = []
    recommendations: list[str] = []


class RiskReport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    risk_score: int = Field(default=0, alias="riskScore")
    risk_tier: str = Field(default="medium", alias="riskTier")  # low | medium | high
    rules_triggered: list[str] = Field(default=[], alias="rulesTriggered")
    requires_approval: bool = Field(default=True, alias="requiresApproval")
    routing: str = "peer_review"  # auto_send | peer_review | manager_approval
    reasoning: str = ""
    usage: dict = {}

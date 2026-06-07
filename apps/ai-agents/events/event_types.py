from dataclasses import dataclass, field
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class EmailCreatedEvent:
    email_id: str
    product_slug: str
    conversation_id: str = ""
    timestamp: str = field(default_factory=_now)
    event_type: str = "email.created"


@dataclass
class EmailSentEvent:
    email_id: str
    recipient: str
    provider: str
    product_slug: str = ""
    timestamp: str = field(default_factory=_now)
    event_type: str = "email.sent"


@dataclass
class ComplianceCheckedEvent:
    email_id: str
    product_slug: str
    passed: bool
    risk_score: int
    violation_count: int = 0
    timestamp: str = field(default_factory=_now)
    event_type: str = "compliance.checked"

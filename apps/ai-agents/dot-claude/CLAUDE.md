# AI Compliance Sentinel — AI Agents

## Project Overview

Enterprise-grade AI-Powered Email Automation Platform with a multi-agent architecture for outbound customer communication. The system uses 10 specialized agents to handle the full email lifecycle: intent understanding → generation → compliance → deliverability → sending → tracking → learning.

## Architecture

```
ai-agents/
├── agents/
│   ├── intent_agent.py          # Agent 1: Intent Understanding
│   ├── recipient_agent.py       # Agent 2: Recipient Intelligence
│   ├── generation_agent.py      # Agent 3: Email Generation
│   ├── template_agent.py        # Agent 4: Template Selection
│   ├── compliance_agent.py      # Agent 5: Compliance Validation
│   ├── deliverability_agent.py  # Agent 6: Deliverability Scoring
│   ├── optimization_agent.py    # Agent 7: Content Optimization
│   ├── sending_agent.py         # Agent 8: Email Delivery
│   ├── tracking_agent.py        # Agent 9: Event Tracking
│   └── learning_agent.py        # Agent 10: Continuous Learning
├── orchestrator/
│   └── agent_orchestrator.py    # Multi-agent workflow coordinator
├── models/
│   ├── email_models.py          # Pydantic schemas
│   └── agent_models.py          # Agent I/O schemas
├── tools/
│   ├── llm_client.py            # OpenAI / Anthropic client
│   ├── email_provider.py        # SendGrid / SES / Mailgun
│   ├── template_engine.py       # Jinja2 template renderer
│   └── deliverability_checker.py
├── events/
│   ├── kafka_producer.py        # Event streaming
│   └── event_types.py           # EmailCreated, EmailSent, etc.
├── api/
│   ├── routes/
│   └── middleware/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── .claude/
    ├── CLAUDE.md                # ← this file
    ├── commands/                # custom slash commands
    └── settings.json            # hooks
```

## Technology Stack

- **Language**: Python 3.11+
- **LLM**: Anthropic Claude (claude-sonnet-4-6 / claude-opus-4-6) + OpenAI GPT-4o
- **Agent SDK**: Anthropic Agent SDK / LangChain / CrewAI
- **Email Providers**: SendGrid, Amazon SES, Mailgun, Postmark
- **Event Streaming**: Apache Kafka
- **Database**: PostgreSQL (primary), Redis (cache), ClickHouse (analytics)
- **API**: FastAPI + GraphQL (Strawberry)
- **Task Queue**: Celery + Redis
- **Observability**: OpenTelemetry, Prometheus, Grafana
- **Testing**: pytest, pytest-asyncio, httpx

## Agent Responsibilities

| Agent | Class | Key Inputs | Key Outputs |
|---|---|---|---|
| Intent | `IntentAgent` | user_message | intent, entities, goal |
| Recipient | `RecipientAgent` | recipient_id | profile, history, preferences |
| Generation | `GenerationAgent` | intent, recipient | email_draft |
| Template | `TemplateAgent` | intent, category | ranked_templates |
| Compliance | `ComplianceAgent` | email_draft | compliance_report |
| Deliverability | `DeliverabilityAgent` | email_draft | deliverability_score |
| Optimization | `OptimizationAgent` | email_draft, scores | optimized_email |
| Sending | `SendingAgent` | optimized_email | send_result |
| Tracking | `TrackingAgent` | email_id, events | analytics |
| Learning | `LearningAgent` | performance_data | model_updates |

## Coding Standards

- All agents inherit from `BaseAgent` with `async def run(input: AgentInput) -> AgentOutput`
- Use Pydantic v2 for all data models — no raw dicts across agent boundaries
- Every agent emits a structured JSON span via OpenTelemetry
- Async-first: `asyncio`, `aiohttp`, `asyncpg`
- Type hints required on all public functions
- Docstrings: Google style
- Max function length: 50 lines — extract helpers freely
- No hardcoded secrets — environment variables via `pydantic-settings`

## Environment Variables

```bash
# LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email Providers
SENDGRID_API_KEY=
AWS_SES_ACCESS_KEY=
AWS_SES_SECRET_KEY=
MAILGUN_API_KEY=

# Database
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
CLICKHOUSE_URL=...

# Kafka
KAFKA_BOOTSTRAP_SERVERS=
KAFKA_TOPIC_PREFIX=email-sentinel

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=
SENTRY_DSN=
```

## Key Patterns

### Agent Base Class
```python
from abc import ABC, abstractmethod
from models.agent_models import AgentInput, AgentOutput

class BaseAgent(ABC):
    name: str
    description: str

    @abstractmethod
    async def run(self, input: AgentInput) -> AgentOutput:
        ...

    async def health_check(self) -> bool:
        return True
```

### Event Publishing
```python
from events.kafka_producer import publish_event
from events.event_types import EmailSentEvent

await publish_event(EmailSentEvent(
    email_id=email.id,
    recipient=email.to,
    provider=result.provider,
    timestamp=utcnow()
))
```

### Compliance Rules
- All outbound emails must pass `ComplianceAgent` before sending
- GDPR: unsubscribe link required for marketing emails
- CAN-SPAM: physical address required
- DKIM/SPF/DMARC validated for each sender domain
- Spam score must be < 3.0 (SpamAssassin scale)

## Running Locally

```bash
pip install -r requirements.txt
python -m orchestrator.agent_orchestrator   # start agents
uvicorn api.main:app --reload --port 8000   # API server
celery -A tasks worker --loglevel=info      # task queue
pytest tests/unit/ -v                       # unit tests
pytest tests/integration/ -v --env=test     # integration tests
pytest --cov=agents --cov-report=html       # coverage
```

## Slash Commands Reference

| Command | Purpose |
|---|---|
| `/generate-email` | Draft email through full AI pipeline |
| `/run-agent` | Invoke a single agent with custom input |
| `/check-deliverability` | Score an email draft for inbox placement |
| `/optimize-email` | Run optimization agent on a draft |
| `/compliance-check` | Validate email against GDPR/CAN-SPAM/brand rules |
| `/scaffold-agent` | Generate boilerplate for a new agent |
| `/test-agent` | Run unit tests for a specific agent |
| `/review-performance` | Summarize agent performance metrics |

## Important Notes

- Never commit API keys — use `.env` or AWS Secrets Manager
- All agent-to-agent communication is async; use `asyncio.gather` for parallel calls
- `LearningAgent` runs on a cron schedule, not in the hot path
- Kafka events are the source of truth for tracking — never skip publishing
- Template selection uses a scoring model trained on historical open/reply rates
- `ComplianceAgent` is a hard gate — failed emails are quarantined, not dropped silently

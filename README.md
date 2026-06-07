# AI Compliance Sentinel for Outbound Customer Communication

> BridgingTech — Production-ready monorepo for AI-powered, compliance-checked outbound email across 7 products.

---

## Architecture

```
├── apps/
│   ├── api/          # Node.js + Express + Prisma  (REST API, DB, approval routing)
│   ├── web/          # React + Vite + Tailwind      (Dashboard, Compose, Approvals UI)
│   └── ai-agents/    # Python + FastAPI + Anthropic (Draft, Compliance, Risk agents)
├── packages/
│   └── shared/       # Shared TypeScript types & constants
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| API | Node.js 20, Express, Prisma, PostgreSQL 16 |
| Web | React 18, Vite, TailwindCSS, React Query |
| AI Agents | Python 3.12, FastAPI, Anthropic Claude, LiteLLM |
| Vector Store | Qdrant |
| Cache / Queue | Redis + BullMQ |
| CI/CD | GitHub Actions |
| Containers | Docker + docker-compose |

## 7 BridgingTech Products

| Product | Regulations |
|---|---|
| Denefits | PCI-DSS, CAN-SPAM |
| Practina | CAN-SPAM |
| Lendee | PCI-DSS, CAN-SPAM |
| CoolCredit | PCI-DSS, CAN-SPAM |
| Credee | PCI-DSS, CAN-SPAM |
| FinanceMutual | HIPAA, CAN-SPAM |
| Recuvery | FDCPA, CAN-SPAM |

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/shubhamkhapra-bridging/AI-Compliance-Sentinel-for-Outbound-Customer-Communication.git
cd AI-Compliance-Sentinel-for-Outbound-Customer-Communication
npm install

# 2. Configure env
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and other required values

# 3. Start infrastructure
docker-compose up postgres redis qdrant -d

# 4. Run DB migrations + seed
npm run db:migrate
npm run db:seed

# 5. Start all apps (hot reload)
npm run dev
```

| Service | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:4000 |
| AI Agents | http://localhost:8000/docs |
| Prisma Studio | `npm run db:studio` |

## Key Flows

### 1 — Compose & Draft (AI-assisted)
1. User selects product + types intent in the web UI
2. API creates a `Conversation`, calls AI Agents `/agents/draft`
3. Draft Agent (Claude) generates subject + body using brand voice
4. Draft saved to `email_drafts`; UI shows it for review

### 2 — Compliance Check
1. On send, API calls AI Agents `/agents/compliance`
2. Compliance Agent checks FDCPA/HIPAA/PCI/GDPR rules
3. Violations returned as structured JSON; email blocked if failed

### 3 — Risk Assessment & Approval Routing
1. Risk Agent scores 0-100 based on product, content, recipient count
2. LOW (0-30) → auto-send; MEDIUM → peer review; HIGH → manager approval
3. `approval_requests` created; approver notified via Slack

### 4 — Bulk Campaigns
1. Segment defined with filter JSON → resolved to SQL
2. Campaign scheduled; worker sends per-recipient emails
3. Events (open, click, reply, bounce) tracked via webhook + pixel

## Database — 10 Domains

See `apps/api/prisma/schema.prisma` for the full schema.

1. Identity & Access
2. Products & Brand
3. Contact Hub
4. Templates
5. Conversations & Drafts
6. Campaigns & Segments
7. Risk & Approval
8. Sending
9. Tracking & Events
10. AI Ops, Compliance & Audit

## Development

```bash
npm run dev          # All apps (hot reload)
npm run build        # Production builds
npm run lint         # ESLint + mypy
npm run test         # All test suites
npm run db:studio    # Prisma Studio GUI
```

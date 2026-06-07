# AI Compliance Sentinel for Outbound Customer Communication

> **BridgingTech** — Enterprise-grade AI-powered email automation platform with compliance enforcement across 7 products. Built as a production-ready monorepo with a 10-agent AI pipeline, Node.js REST API, React dashboard, and PostgreSQL/Redis/Qdrant backend.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Step 1 — Clone & Install](#step-1--clone--install)
- [Step 2 — Environment Setup](#step-2--environment-setup)
- [Step 3 — Start Infrastructure (Docker)](#step-3--start-infrastructure-docker)
- [Step 4 — Database Setup (Node.js API)](#step-4--database-setup-nodejs-api)
- [Step 5 — Run the Node.js API](#step-5--run-the-nodejs-api)
- [Step 6 — Run the Python AI Agents](#step-6--run-the-python-ai-agents)
- [Step 7 — Run the Frontend](#step-7--run-the-frontend)
- [Step 8 — Run Everything Together (Turborepo)](#step-8--run-everything-together-turborepo)
- [Service URLs](#service-urls)
- [Database GUI](#database-gui)
- [Running Tests](#running-tests)
- [Docker — Full Stack](#docker--full-stack)
- [7 BridgingTech Products](#7-bridgingtech-products)
- [Key Flows](#key-flows)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
AI-Compliance-Sentinel/
├── apps/
│   ├── api/              # Node.js 20 + Express + Prisma ORM  → :4000
│   ├── web/              # React 18 + Vite + TailwindCSS       → :3000
│   └── ai-agents/        # Python 3.12 + FastAPI + Anthropic   → :8000
├── packages/
│   └── shared/           # Shared TypeScript types & constants
├── docker-compose.yml          # App services (api, web, ai-agents, qdrant)
├── docker-compose.infra.yml    # Infra services (postgres, redis, pgadmin, redis-insight)
└── .github/workflows/ci.yml
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| API | Node.js 20, Express, Prisma 5, PostgreSQL 16 |
| Web | React 18, Vite 5, TailwindCSS 3, React Query, React Router |
| AI Agents | Python 3.12, FastAPI, Anthropic Claude, LiteLLM, OpenAI |
| Vector Store | Qdrant v1.9 |
| Cache / Queue | Redis 7 + BullMQ |
| DB Admin | pgAdmin 4 (`:5050`), RedisInsight (`:5540`) |
| CI/CD | GitHub Actions |
| Containers | Docker + Docker Compose |

---

## Prerequisites

Make sure the following are installed before you begin:

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 20 | `node -v` |
| npm | >= 10 | `npm -v` |
| Python | >= 3.12 | `python --version` |
| pip | latest | `pip --version` |
| Docker Desktop | latest | `docker -v` |
| Git | any | `git --version` |

---

## Project Structure

```
apps/api/
├── src/
│   ├── routes/         # Express route handlers
│   ├── middleware/      # Auth, error handling, logging
│   └── db/client.ts    # Prisma client singleton
├── prisma/
│   ├── schema.prisma   # Full 10-domain data model
│   └── seed.ts         # Database seed data
└── Dockerfile

apps/ai-agents/
├── agents/             # 10 specialized AI agents
├── orchestrator/       # Multi-agent workflow coordinator
├── routers/            # FastAPI route handlers
├── models/             # Pydantic schemas
├── tools/              # LLM client, email providers, templates
├── events/             # Kafka producer & event types
└── Dockerfile

apps/web/
├── src/
│   ├── pages/          # Dashboard, Compose, Campaigns, etc.
│   ├── components/     # Shared UI components
│   ├── api/            # Axios API client
│   └── hooks/          # Zustand auth store
└── Dockerfile
```

---

## Step 1 — Clone & Install

```bash
# Clone the repository
git clone https://github.com/shubhamkhapra-bridging/AI-Compliance-Sentinel-for-Outbound-Customer-Communication.git
cd AI-Compliance-Sentinel-for-Outbound-Customer-Communication

# Install all Node.js dependencies (api + web + packages/shared)
npm install
```

---

## Step 2 — Environment Setup

### Root `.env` (Node.js API + Web)

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# Required — get from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Database (already correct if using Docker infra)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_compliance"
REDIS_URL="redis://localhost:6379"

# JWT — change in production
JWT_SECRET=dev-jwt-secret-change-in-production-32c

# Optional
OPENAI_API_KEY=sk-...
```

### AI Agents `.env` (Python service)

```bash
cp apps/ai-agents/.env.example apps/ai-agents/.env
```

Open `apps/ai-agents/.env` and fill in:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Database (already correct if using Docker infra)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_compliance
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333

# Optional — email sending
SENDGRID_API_KEY=SG....
```

---

## Step 3 — Start Infrastructure (Docker)

The infrastructure runs in Docker — PostgreSQL, Redis, pgAdmin, and RedisInsight. Your app services run locally for hot-reload development.

```bash
# Start all infrastructure containers
docker compose -f docker-compose.infra.yml up -d
```

Verify all 4 containers are healthy:

```bash
docker ps
```

Expected output:

```
NAMES          STATUS
pgadmin_web    Up X seconds
redis_ui       Up X seconds
redis_server   Up X seconds (healthy)
postgres_db    Up X seconds (healthy)
```

To stop infrastructure:

```bash
docker compose -f docker-compose.infra.yml down
```

---

## Step 4 — Database Setup (Node.js API)

Run Prisma migrations to create the database schema, then seed it with initial data.

```bash
cd apps/api

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev

# Seed with initial data (products, roles, sample users)
npx tsx prisma/seed.ts

# Go back to root
cd ../..
```

> **Tip:** To explore the database visually in a browser:
> ```bash
> cd apps/api && npx prisma studio
> ```
> Opens at `http://localhost:5555`

---

## Step 5 — Run the Node.js API

```bash
cd apps/api
npm run dev
```

The API starts at **`http://localhost:4000`** with hot-reload via `tsx watch`.

Verify it's running:

```bash
curl http://localhost:4000/health
```

**Available API routes:**

| Route | Description |
|---|---|
| `POST /api/v1/auth/login` | Login and get JWT |
| `GET /api/v1/contacts` | List contacts |
| `GET /api/v1/campaigns` | List campaigns |
| `GET /api/v1/templates` | List email templates |
| `GET /api/v1/approvals` | Pending approvals |
| `GET /api/v1/analytics` | Email analytics |

---

## Step 6 — Run the Python AI Agents

Open a **new terminal**.

```bash
cd apps/ai-agents

# Create a virtual environment
python -m venv .venv

# Activate it
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The AI Agents service starts at **`http://localhost:8000`**.

Verify it's running:

```bash
curl http://localhost:8000/health
```

**Interactive API docs:** `http://localhost:8000/docs`

**Available agent endpoints:**

| Endpoint | Agent | Description |
|---|---|---|
| `POST /agents/draft` | GenerationAgent | AI email draft generation |
| `POST /agents/compliance` | ComplianceAgent | GDPR/CAN-SPAM/FDCPA check |
| `POST /agents/risk` | RiskAgent | Risk scoring (0–100) |
| `POST /embeddings` | — | Vector embeddings for Qdrant |

---

## Step 7 — Run the Frontend

Open a **new terminal**.

```bash
cd apps/web
npm run dev
```

The web app starts at **`http://localhost:3000`**.

**Pages:**

| Page | URL | Description |
|---|---|---|
| Login | `/login` | JWT authentication |
| Dashboard | `/` | Overview & metrics |
| Compose | `/compose` | AI-assisted email drafting |
| Campaigns | `/campaigns` | Bulk email campaigns |
| Contacts | `/contacts` | Contact management |
| Approvals | `/approvals` | Risk-based approval queue |
| Analytics | `/analytics` | Open/click/reply tracking |

---

## Step 8 — Run Everything Together (Turborepo)

Instead of running each service separately, you can use Turborepo to start all Node.js apps at once from the root:

```bash
# From root — starts api + web in parallel
npm run dev
```

> **Note:** The Python AI Agents service must still be started separately (Step 6) since Turborepo only manages Node.js workspaces.

---

## Service URLs

| Service | URL | Credentials |
|---|---|---|
| **Web App** | `http://localhost:3000` | see seed data |
| **Node.js API** | `http://localhost:4000` | — |
| **AI Agents API** | `http://localhost:8000` | — |
| **AI Agents Docs** | `http://localhost:8000/docs` | — |
| **Qdrant UI** | `http://localhost:6333/dashboard` | — |

---

## Database GUI

Both tools run in Docker and are ready after Step 3.

### pgAdmin — PostgreSQL
**URL:** `http://localhost:5050`

| Field | Value |
|---|---|
| Email | `admin@bridgingtech.com` |
| Password | `Admin@123456` |

After login, register a server:
- **Right-click Servers → Register → Server**
- Name: `ai_compliance`
- Host: `postgres_db`
- Port: `5432`
- Username: `postgres`
- Password: `postgres`

### RedisInsight — Redis
**URL:** `http://localhost:5540`

Add database:
- Host: `redis_server`
- Port: `6379`

---

## Running Tests

### Node.js API tests

```bash
cd apps/api
npm test
```

### Python AI Agents tests

```bash
cd apps/ai-agents
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pytest tests/unit/ -v
pytest tests/integration/ -v
pytest --cov=agents --cov-report=html   # with coverage
```

### All tests from root (Turborepo)

```bash
npm run test
```

---

## Docker — Full Stack

To run everything in Docker (no local Node.js or Python needed):

```bash
# 1. Start infrastructure
docker compose -f docker-compose.infra.yml up -d

# 2. Start app services
docker compose up -d

# 3. View logs
docker compose logs -f api
docker compose logs -f ai-agents
docker compose logs -f web
```

> **Note:** App Docker images require Dockerfiles present in `apps/api`, `apps/web`, and `apps/ai-agents`. The `docker-compose.yml` builds them automatically.

---

## 7 BridgingTech Products

| Product | Compliance Regulations |
|---|---|
| **Denefits** | PCI-DSS, CAN-SPAM |
| **Practina** | CAN-SPAM |
| **Lendee** | PCI-DSS, CAN-SPAM |
| **CoolCredit** | PCI-DSS, CAN-SPAM |
| **Credee** | PCI-DSS, CAN-SPAM |
| **FinanceMutual** | HIPAA, CAN-SPAM |
| **Recuvery** | FDCPA, CAN-SPAM |

Each product has its own brand voice, compliance rules, and email templates enforced by the AI agents pipeline.

---

## Key Flows

### Email Compose & Draft
```
User types intent → API creates Conversation
→ AI Agents /agents/draft (Claude generates subject + body)
→ Draft saved to DB → UI displays for review
```

### Compliance Check
```
User hits Send → API calls /agents/compliance
→ ComplianceAgent checks FDCPA/HIPAA/PCI/GDPR rules
→ Violations returned as JSON → email blocked if failed
```

### Risk Assessment & Approval Routing
```
RiskAgent scores 0–100
→ LOW  (0–30)   → auto-send
→ MEDIUM (31–70) → peer review required
→ HIGH  (71–100) → manager approval required
→ approval_request created → approver notified
```

---

## Troubleshooting

### `prisma migrate dev` fails — "Can't reach database"
Make sure the Docker infra is running:
```bash
docker compose -f docker-compose.infra.yml up -d
docker ps  # confirm postgres_db is healthy
```

### Python `ModuleNotFoundError`
Make sure your virtual environment is activated:
```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### Port already in use
```bash
# Find what's on port 4000 (Windows)
netstat -ano | findstr :4000

# Kill it
taskkill /PID <pid> /F
```

### Docker containers in restart loop
```bash
# Check logs
docker compose -f docker-compose.infra.yml logs postgres
docker compose -f docker-compose.infra.yml logs redis

# Full reset
docker compose -f docker-compose.infra.yml down -v
docker compose -f docker-compose.infra.yml up -d
```

### `ANTHROPIC_API_KEY` not set error
Add your key to **both** `.env` files:
- `.env` (root) → used by the Node.js API
- `apps/ai-agents/.env` → used by the Python service

Get a key at [console.anthropic.com](https://console.anthropic.com).

---

## Development Scripts Reference

| Command | Location | Description |
|---|---|---|
| `npm run dev` | root | Start api + web (hot reload) |
| `npm run build` | root | Production builds for all apps |
| `npm run test` | root | Run all test suites |
| `npm run lint` | root | ESLint across all packages |
| `npm run db:migrate` | root | Run Prisma migrations |
| `npm run db:seed` | root | Seed database |
| `npm run dev` | `apps/api` | Start API server with hot reload |
| `npx prisma studio` | `apps/api` | Open Prisma DB GUI |
| `npm run dev` | `apps/web` | Start Vite dev server |
| `uvicorn main:app --reload` | `apps/ai-agents` | Start Python FastAPI server |
| `pytest tests/ -v` | `apps/ai-agents` | Run Python tests |

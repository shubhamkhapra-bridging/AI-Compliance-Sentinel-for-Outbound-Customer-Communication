# AI Compliance Sentinel — Claude Code Guide

Enterprise monorepo for AI-powered, compliance-checked outbound email across 7 BridgingTech products.

## Monorepo Layout

```
apps/api/          Node.js 20 + Express + Prisma    → :4000
apps/web/          React 18 + Vite + TailwindCSS    → :3000
apps/ai-agents/    Python 3.12 + FastAPI + Anthropic → :8000
packages/shared/   Shared TypeScript types
```

## Slash Commands

### AI Agent Pipeline
| Command | What it does |
|---|---|
| `/generate-email` | Run full 10-agent pipeline to draft + validate an email |
| `/compliance-check` | Check email against GDPR / CAN-SPAM / CASL / brand rules |
| `/check-deliverability` | Score spam risk, inbox placement, sender reputation |
| `/optimize-email` | Improve subject, body, and send timing via OptimizationAgent |
| `/run-agent` | Invoke a single agent directly with JSON input |
| `/scaffold-agent` | Generate boilerplate for a new agent |
| `/test-agent` | Run unit/integration tests for a specific agent |
| `/review-performance` | Summarize agent metrics and email engagement analytics |

### Frontend (React + Vite)
| Command | What it does |
|---|---|
| `/fe-dev` | Start Vite dev server with hot reload |
| `/fe-build` | TypeScript check + production bundle |
| `/fe-add-page` | Scaffold a new page with routing + React Query |
| `/fe-add-component` | Scaffold a new reusable component |
| `/fe-typecheck` | Run tsc --noEmit across web + shared packages |

### Node.js API (Express + Prisma)
| Command | What it does |
|---|---|
| `/api-dev` | Start Express API with tsx watch hot reload |
| `/api-add-route` | Scaffold a new route with validation + Prisma query |
| `/api-db-migrate` | Run Prisma migrations |
| `/api-db-seed` | Seed database with products, roles, demo users |
| `/api-db-studio` | Open Prisma Studio at localhost:5555 |
| `/api-test` | Run Vitest test suite |

### Python AI Agents (FastAPI)
| Command | What it does |
|---|---|
| `/py-dev` | Start FastAPI server with uvicorn --reload |
| `/py-test` | Run pytest with optional coverage |
| `/py-lint` | Run Ruff linter + formatter |
| `/py-add-router` | Scaffold a new FastAPI router + agent wiring |
| `/py-shell` | Open async Python REPL with agents pre-imported |

## Key Files

| File | Purpose |
|---|---|
| `docker-compose.infra.yml` | Postgres, Redis, pgAdmin, RedisInsight |
| `docker-compose.yml` | App services: api, web, ai-agents, qdrant |
| `.env` | Root secrets — Node.js API + Web |
| `apps/ai-agents/.env` | Python service secrets |
| `apps/api/prisma/schema.prisma` | Full 10-domain database schema |
| `apps/ai-agents/main.py` | FastAPI app entry point |
| `apps/api/src/app.ts` | Express app entry point |
| `apps/web/src/App.tsx` | React router root |

## Coding Rules

### All code
- No hardcoded secrets — always environment variables
- No `console.log` in production code — use the logger

### TypeScript (api + web)
- Strict TypeScript — no `any`
- `express-validator` for all API input validation
- React Query for all server state — no raw `useEffect` fetching
- Named exports for components; default export for pages

### Python (ai-agents)
- All agents inherit `BaseAgent` with `async def run(input) -> output`
- Pydantic v2 models for all agent I/O — no raw dicts across boundaries
- `structlog` for logging — no `print()`
- Return type hints required on all public functions
- OpenTelemetry spans on all agent `run()` methods

## Infrastructure Commands

```bash
# Start infra (run first)
docker compose -f docker-compose.infra.yml up -d

# Start all app services via Turborepo
npm run dev

# Python service (separate terminal)
cd apps/ai-agents && .venv/Scripts/activate && uvicorn main:app --reload --port 8000
```

## Service URLs

| Service | URL |
|---|---|
| Web App | http://localhost:3000 |
| API | http://localhost:4000 |
| AI Agents + Docs | http://localhost:8000/docs |
| pgAdmin | http://localhost:5050 |
| RedisInsight | http://localhost:5540 |
| Qdrant | http://localhost:6333/dashboard |
| Prisma Studio | http://localhost:5555 (via `/api-db-studio`) |

# Python — Add Router

Scaffold a new FastAPI router with auth, request/response models, and agent wiring.

## Usage

```
/py-add-router <router_name> <prefix> <description>
```

## Examples

```
/py-add-router sending /agents/send "Trigger the SendingAgent to deliver an email"
/py-add-router tracking /agents/track "Record email events from webhooks"
/py-add-router learning /agents/learn "Trigger LearningAgent to update models"
```

## What Gets Generated

1. **`apps/ai-agents/routers/<router_name>.py`** — FastAPI router:
   - Pydantic request/response models
   - API key authentication via `core/security.py`
   - Agent invocation
   - Structured logging
   - HTTP error handling

2. **Registration** — instruction to add to `apps/ai-agents/main.py`:
   ```python
   from routers import <router_name>
   app.include_router(<router_name>.router, prefix="<prefix>", tags=["<RouterName>"])
   ```

## Generated Router Template

```python
# routers/<router_name>.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.security import verify_api_key
from core.logger import logger
from agents.<agent_name>_agent import <AgentName>Agent

router = APIRouter()
agent = <AgentName>Agent()


class <RouterName>Request(BaseModel):
    # TODO: define request fields
    pass


class <RouterName>Response(BaseModel):
    status: str
    # TODO: define response fields


@router.post("/", response_model=<RouterName>Response)
async def <router_name>(
    request: <RouterName>Request,
    _: str = Depends(verify_api_key),
) -> <RouterName>Response:
    logger.info("<router_name>_request", data=request.model_dump())
    try:
        result = await agent.run(request)
        return <RouterName>Response(status="ok", **result.model_dump())
    except Exception as e:
        logger.error("<router_name>_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
```

## Notes

- All routers require `verify_api_key` — the `AI_AGENTS_API_KEY` header must match `.env`.
- Use `structlog` via `core/logger.py` — no `print()` statements.
- Response models must be Pydantic v2 — no raw dicts returned from handlers.
- Add the new endpoint to the `/health` response so the Node.js API can verify availability.

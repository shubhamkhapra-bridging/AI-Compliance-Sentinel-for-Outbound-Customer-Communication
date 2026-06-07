# Python — Start AI Agents Dev Server

Start the FastAPI AI Agents service in development mode with hot reload.

## Usage

```
/py-dev
```

## Steps

1. Check that the virtual environment exists:
   ```bash
   ls apps/ai-agents/.venv || echo "venv missing"
   ```

2. If missing, create and install:
   ```bash
   cd apps/ai-agents
   python -m venv .venv

   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. Activate the venv and verify dependencies:
   ```bash
   # Windows
   apps/ai-agents/.venv/Scripts/python -m uvicorn --version
   ```

4. Verify infra is running:
   ```bash
   docker ps --filter "name=postgres_db" --filter "name=redis_server" \
     --format "{{.Names}}: {{.Status}}"
   ```

5. Start the FastAPI server:
   ```bash
   cd apps/ai-agents && .venv/Scripts/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   # macOS/Linux: source .venv/bin/activate && uvicorn main:app --reload --port 8000
   ```

6. Confirm startup:
   ```
   AI Agents running at : http://localhost:8000
   Interactive docs     : http://localhost:8000/docs
   Environment          : development
   LLM provider         : anthropic (claude-sonnet-4-6)
   Kafka                : disabled

   Endpoints:
     POST /agents/draft
     POST /agents/compliance
     POST /agents/risk
     POST /embeddings
     GET  /health
   ```

## Notes

- `--reload` watches `apps/ai-agents/` for file changes and restarts automatically.
- Set `ANTHROPIC_API_KEY` in `apps/ai-agents/.env` before starting — the service will fail without it.
- Qdrant is optional for basic operation but required for `/embeddings` endpoint.

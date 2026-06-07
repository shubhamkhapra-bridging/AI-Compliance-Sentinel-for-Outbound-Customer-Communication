from fastapi import Header, HTTPException, status
from core.config import settings


async def verify_api_key(x_api_key: str = Header(...)) -> None:
    if x_api_key != settings.AI_AGENTS_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")

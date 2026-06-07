from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.web_knowledge_agent import WebKnowledgeAgent
from agents.fix_draft_agent import FixDraftAgent
from models.agent_models import AgentInput
from tools.email_template import (
    extract_recipe,
    render_with_recipe,
    plain_text_from_paragraphs,
)
from core.security import verify_api_key
from core.logger import logger

router = APIRouter(dependencies=[Depends(verify_api_key)])

_web_knowledge = WebKnowledgeAgent()
_fix_draft = FixDraftAgent()


class FixPayload(BaseModel):
    draftSubject: str
    draftBodyHtml: str
    draftBodyText: str = ""
    violations: list[dict] = []
    productId: str
    productSlug: str = "unknown"
    websiteUrl: str | None = None


@router.post("")
async def fix_draft(payload: FixPayload):
    knowledge_out = await _web_knowledge.run(AgentInput(context={
        "product_id": payload.productId,
        "product_slug": payload.productSlug,
        "website_url": payload.websiteUrl,
    }))
    knowledge = knowledge_out.data.get("knowledge", {})

    recipe = extract_recipe(payload.draftBodyHtml)

    # Preferred path: fix structured content, re-render the SAME branded template
    if recipe and recipe.get("content") is not None:
        fix_out = await _fix_draft.run(AgentInput(context={
            "content": recipe["content"],
            "violations": payload.violations,
            "product_knowledge": knowledge,
            "product_slug": payload.productSlug,
        }))

        new_content = {**recipe["content"], **fix_out.data.get("fixed_content", {})}
        new_html = render_with_recipe(new_content, recipe.get("style"))
        body_text = plain_text_from_paragraphs(
            new_content.get("body_paragraphs", []),
            headline=new_content.get("headline", ""),
            cta_text=new_content.get("cta_text", ""),
            cta_url=new_content.get("cta_url", ""),
        )
        logger.info("fix_draft_recipe", changes=len(fix_out.data.get("changes", [])))
        return {
            "subject": new_content.get("subject", payload.draftSubject),
            "bodyHtml": new_html,
            "bodyText": body_text,
            "changes": fix_out.data.get("changes", []),
            "knowledgeSource": knowledge_out.data.get("source", "none"),
            "method": "recipe",
            "usage": {**knowledge_out.usage, **fix_out.usage},
        }

    # Fallback: patch raw HTML while preserving styling
    fix_out = await _fix_draft.fix_html(
        subject=payload.draftSubject,
        body_html=payload.draftBodyHtml,
        body_text=payload.draftBodyText,
        violations=payload.violations,
        knowledge=knowledge,
        product_slug=payload.productSlug,
    )
    logger.info("fix_draft_html_fallback")
    return {
        "subject": fix_out.data.get("subject"),
        "bodyHtml": fix_out.data.get("body_html"),
        "bodyText": fix_out.data.get("body_text"),
        "changes": fix_out.data.get("changes", []),
        "knowledgeSource": knowledge_out.data.get("source", "none"),
        "method": "html_fallback",
        "usage": {**knowledge_out.usage, **fix_out.usage},
    }

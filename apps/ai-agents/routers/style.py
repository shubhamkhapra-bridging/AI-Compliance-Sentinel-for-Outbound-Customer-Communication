from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.style_edit_agent import StyleEditAgent
from models.agent_models import AgentInput
from tools.email_template import (
    extract_recipe,
    render_with_recipe,
    plain_text_from_paragraphs,
)
from tools.brand_extractor import (
    first_url,
    extract_brand_from_site,
    extract_brand_from_image,
)
from core.security import verify_api_key
from core.logger import logger

router = APIRouter(dependencies=[Depends(verify_api_key)])

_agent = StyleEditAgent()


class StylePayload(BaseModel):
    bodyHtml: str
    instruction: str = ""
    imageBase64: str | None = None  # data URL of an uploaded screenshot


async def _gather_brand_sources(instruction: str, image: str | None) -> tuple[dict, dict, list[str]]:
    """Pull style/content from a website URL and/or screenshot mentioned by the user."""
    style: dict = {}
    content: dict = {}
    notes: list[str] = []

    url = first_url(instruction)
    if url:
        # A direct image URL → treat as logo; otherwise scrape the site for branding
        is_image = url.lower().rsplit("?", 1)[0].endswith(
            (".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp")
        )
        if is_image:
            content["logo_url"] = url
            notes.append("Added logo from URL")
        else:
            site = await extract_brand_from_site(url)
            if site.get("logo_url"):
                content["logo_url"] = site["logo_url"]
            if site.get("primary_color"):
                style["primary_color"] = site["primary_color"]
                style["accent_color"] = site["primary_color"]
            if site:
                notes.append(f"Imported branding from {url}")

    if image:
        colors = await extract_brand_from_image(image)
        for k in ("primary_color", "accent_color", "button_color"):
            if colors.get(k):
                style[k] = colors[k]
        if colors:
            notes.append("Applied colors from screenshot")

    return style, content, notes


@router.post("")
async def restyle(payload: StylePayload):
    recipe = extract_recipe(payload.bodyHtml)

    src_style, src_content, notes = await _gather_brand_sources(
        payload.instruction, payload.imageBase64
    )

    # Precise path: re-render from the embedded recipe
    if recipe and recipe.get("content") is not None:
        explicit_style: dict = {}
        explicit_content: dict = {}
        summary = ""
        usage: dict = {}

        # Only run the text parser if there's a free-text instruction beyond a bare URL
        if payload.instruction.strip():
            out = await _agent.run(AgentInput(context={
                "instruction": payload.instruction,
                "current_style": recipe.get("style"),
                "current_content": recipe.get("content"),
            }))
            explicit_style = out.data.get("style", {})
            explicit_content = out.data.get("content", {})
            summary = out.data.get("summary", "")
            usage = out.usage

        # Merge precedence: recipe < extracted sources < explicit text instruction
        new_style = {**(recipe.get("style") or {}), **src_style, **explicit_style}
        new_content = {**(recipe.get("content") or {}), **src_content, **explicit_content}

        new_html = render_with_recipe(new_content, new_style)
        body_text = plain_text_from_paragraphs(
            new_content.get("body_paragraphs", []),
            headline=new_content.get("headline", ""),
            cta_text=new_content.get("cta_text", ""),
            cta_url=new_content.get("cta_url", ""),
        )
        changes = ([summary] if summary else []) + notes or ["Email updated"]
        logger.info("restyle_recipe", notes=notes)
        return {
            "bodyHtml": new_html,
            "bodyText": body_text,
            "changes": changes,
            "method": "recipe",
            "usage": usage,
        }

    # Fallback: no recipe — patch the HTML directly via the LLM
    new_html, usage = await _agent.edit_html(payload.instruction, payload.bodyHtml)
    logger.info("restyle_llm_edit")
    return {
        "bodyHtml": new_html,
        "bodyText": "",
        "changes": notes or ["Styling updated"],
        "method": "llm_edit",
        "usage": usage,
    }

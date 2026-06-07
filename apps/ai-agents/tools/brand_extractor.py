"""Brand extraction — pull logo + colors from a live website or a screenshot image.

Used by the chat-edit flow so a user can say "match lendee.com" or upload a
screenshot and have the email template adopt that branding automatically.
"""
import json
import re
from collections import Counter
from urllib.parse import urljoin

import httpx

from tools.llm_client import vision_chat
from core.logger import logger

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ComplianceSentinel/1.0)"}

_URL_RE = re.compile(r"https?://[^\s\"'<>)]+", re.I)


def first_url(text: str) -> str | None:
    """Return the first http(s) URL found in a string, if any."""
    m = _URL_RE.search(text or "")
    return m.group(0) if m else None


def _is_grayish(hex6: str) -> bool:
    try:
        r, g, b = int(hex6[0:2], 16), int(hex6[2:4], 16), int(hex6[4:6], 16)
    except ValueError:
        return True
    # near-gray (low saturation) or near black/white
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 24:
        return True
    if mx > 240 and mn > 240:
        return True
    if mx < 24:
        return True
    return False


def _find_logo(html: str, base: str) -> str:
    # 1. an <img> that looks like a logo
    for m in re.finditer(r"<img[^>]+>", html, re.I):
        tag = m.group(0)
        if "logo" in tag.lower():
            src = re.search(r'src=["\']([^"\']+)["\']', tag, re.I)
            if src:
                return urljoin(base, src.group(1))
    # 2. Open Graph image
    og = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html, re.I
    )
    if og:
        return urljoin(base, og.group(1))
    # 3. apple-touch-icon / icon link
    icon = re.search(
        r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]+href=["\']([^"\']+)', html, re.I
    )
    if icon:
        return urljoin(base, icon.group(1))
    return ""


def _find_primary_color(html: str) -> str:
    tc = re.search(
        r'<meta[^>]+name=["\']theme-color["\'][^>]+content=["\'](#[0-9a-fA-F]{3,6})',
        html, re.I,
    )
    if tc:
        return tc.group(1)
    hexes = [h.lower() for h in re.findall(r"#([0-9a-fA-F]{6})", html)]
    candidates = [h for h in hexes if not _is_grayish(h)]
    if candidates:
        return "#" + Counter(candidates).most_common(1)[0][0].upper()
    return ""


async def extract_brand_from_site(url: str) -> dict:
    """Fetch a website and extract {logo_url, primary_color} where possible."""
    if not url.startswith("http"):
        url = "https://" + url
    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url, timeout=8.0)
            html = resp.text
            base = str(resp.url)
    except Exception as exc:
        logger.warning("brand_site_fetch_failed", url=url, error=str(exc))
        return {}

    result: dict = {}
    logo = _find_logo(html, base)
    if logo:
        result["logo_url"] = logo
    color = _find_primary_color(html)
    if color:
        result["primary_color"] = color
    logger.info("brand_site_extracted", url=url, found=list(result.keys()))
    return result


_VISION_SYSTEM = """You are a brand-color extractor. Given a screenshot of a website,
app, or brand, identify the dominant brand colors.

Respond ONLY with JSON (hex colors):
{ "primary_color": "#RRGGBB", "accent_color": "#RRGGBB", "button_color": "#RRGGBB" }"""


async def extract_brand_from_image(image_data_url: str) -> dict:
    """Use a vision model to extract brand colors from a screenshot (data URL)."""
    try:
        raw, _ = await vision_chat(
            system=_VISION_SYSTEM,
            text="Extract the main brand colors from this image as hex values.",
            image_url=image_data_url,
            agent_type="brand_extractor",
            max_tokens=200,
        )
    except Exception as exc:
        logger.warning("brand_image_failed", error=str(exc))
        return {}

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

    result = {
        k: v for k, v in parsed.items()
        if k in ("primary_color", "accent_color", "button_color")
        and isinstance(v, str) and v.startswith("#")
    }
    logger.info("brand_image_extracted", found=list(result.keys()))
    return result

"""Professional branded HTML email template — inline CSS, fully email-client compatible.

Design: modern floating card with branded header, eyebrow label, headline,
body, optional detail rows, prominent CTA, signature, and rich footer.

A base64 "recipe" (content + style tokens) is embedded as an invisible HTML
comment so chat-driven restyling can re-render the exact same email with new
colors / fonts without regenerating any copy.
"""
import base64
import json
import re
from datetime import datetime
from jinja2 import Environment, BaseLoader, select_autoescape

_env = Environment(
    loader=BaseLoader(),
    autoescape=select_autoescape(["html", "xml"]),
)

# ─── Default style tokens (overridable by brand kit OR chat) ──────────────
DEFAULT_STYLE: dict[str, str] = {
    "primary_color":     "#2563EB",   # header band + accents
    "accent_color":      "#2563EB",   # eyebrow label + links
    "button_color":      "#2563EB",
    "button_text_color": "#FFFFFF",
    "heading_color":     "#111827",
    "text_color":        "#4B5563",
    "muted_color":       "#9CA3AF",
    "bg_color":          "#F3F4F6",   # page background
    "card_bg":           "#FFFFFF",
    "font_family":       "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    "heading_font_size": "28px",
    "body_font_size":    "15px",
    "button_radius":     "10px",
    "card_radius":       "16px",
}

_INTENT_LABELS = {
    "follow_up":         "Follow-Up",
    "introduction":      "Introduction",
    "payment_reminder":  "Payment Reminder",
    "compliance_notice": "Compliance Notice",
    "promotional":       "Special Offer",
    "support":           "Support",
}

# Email intent → layout variant. All variants share the same compliant footer;
# only the hero / emphasis / CTA treatment changes.
_INTENT_TEMPLATE = {
    "promotional":       "promotional",
    "payment_reminder":  "payment",
    "compliance_notice": "notice",
    "follow_up":         "standard",
    "introduction":      "standard",
    "support":           "standard",
}


def select_template(intent: str | None) -> str:
    """Pick a layout variant from the email intent."""
    return _INTENT_TEMPLATE.get((intent or "").strip(), "standard")

_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
  <title>{{ subject }}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;min-width:100%;width:100%;background-color:{{ bg_color }};font-family:{{ font_family }};-webkit-font-smoothing:antialiased;mso-line-height-rule:exactly;">

  {% if preheader %}<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{{ bg_color }};">{{ preheader }}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>{% endif %}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{{ bg_color }};">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:{{ card_bg }};border-radius:{{ card_radius }};overflow:hidden;box-shadow:0 10px 45px rgba(15,23,42,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:{{ primary_color }};padding:{% if template == 'promotional' %}34px 40px{% else %}30px 40px{% endif %};text-align:center;">
              {% if logo_url %}
              <img src="{{ logo_url }}" alt="{{ company_name }}" height="42" style="display:block;margin:0 auto;max-width:220px;height:42px;object-fit:contain;border:0;" />
              {% else %}
              <span style="display:inline-block;color:#ffffff;font-size:23px;font-weight:800;letter-spacing:-0.4px;line-height:1;">{{ company_name }}</span>
              {% endif %}
            </td>
          </tr>

          {% if template == 'promotional' %}
          <!-- PROMOTIONAL HERO -->
          <tr>
            <td style="background-color:{{ primary_color }};padding:0 40px 40px 40px;text-align:center;">
              {% if intent_label %}
              <p style="margin:0 0 14px;color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">{{ intent_label }}</p>
              {% endif %}
              <h1 style="margin:0;color:#ffffff;font-size:34px;font-weight:800;line-height:1.2;letter-spacing:-0.6px;">{{ headline }}</h1>
            </td>
          </tr>
          {% elif template == 'notice' %}
          <!-- COMPLIANCE NOTICE BANNER -->
          <tr>
            <td style="padding:32px 48px 0 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid {{ accent_color }};background-color:{{ bg_color }};border-radius:8px;">
                <tr><td style="padding:16px 20px;">
                  {% if intent_label %}<p style="margin:0 0 6px;color:{{ accent_color }};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">{{ intent_label }}</p>{% endif %}
                  <h1 style="margin:0;color:{{ heading_color }};font-size:22px;font-weight:700;line-height:1.35;">{{ headline }}</h1>
                </td></tr>
              </table>
            </td>
          </tr>
          {% else %}
          <!-- HEADLINE (standard / payment) -->
          <tr>
            <td style="padding:40px 48px 0 48px;">
              {% if intent_label %}
              <p style="margin:0 0 12px;color:{{ accent_color }};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;">{{ intent_label }}</p>
              {% endif %}
              <h1 style="margin:0 0 22px;color:{{ heading_color }};font-size:{{ heading_font_size }};font-weight:700;line-height:1.3;letter-spacing:-0.5px;">{{ headline }}</h1>
            </td>
          </tr>
          {% endif %}

          {% if template == 'payment' and details %}
          <!-- PAYMENT EMPHASIS CARD -->
          <tr>
            <td style="padding:26px 48px 6px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{{ primary_color }};border-radius:14px;">
                {% for d in details %}
                <tr>
                  <td style="padding:16px 22px;{% if not loop.last %}border-bottom:1px solid rgba(255,255,255,0.15);{% endif %}">
                    <span style="color:rgba(255,255,255,0.75);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">{{ d.label }}</span>
                  </td>
                  <td align="right" style="padding:16px 22px;{% if not loop.last %}border-bottom:1px solid rgba(255,255,255,0.15);{% endif %}">
                    <span style="color:#ffffff;font-size:18px;font-weight:800;">{{ d.value }}</span>
                  </td>
                </tr>
                {% endfor %}
              </table>
            </td>
          </tr>
          {% endif %}

          <!-- BODY -->
          <tr>
            <td style="padding:{% if template == 'promotional' %}36px 48px 0 48px{% else %}28px 48px 0 48px{% endif %};">
              {% for para in body_paragraphs %}
              <p style="margin:0 0 18px;color:{{ text_color }};font-size:{{ body_font_size }};line-height:1.8;">{{ para }}</p>
              {% endfor %}
            </td>
          </tr>

          {% if details and template != 'payment' %}
          <!-- DETAIL ROWS -->
          <tr>
            <td style="padding:8px 48px 4px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{{ bg_color }};border-radius:12px;">
                {% for d in details %}
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.05);">
                    <span style="color:{{ muted_color }};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">{{ d.label }}</span>
                  </td>
                  <td align="right" style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.05);">
                    <span style="color:{{ heading_color }};font-size:15px;font-weight:700;">{{ d.value }}</span>
                  </td>
                </tr>
                {% endfor %}
              </table>
            </td>
          </tr>
          {% endif %}

          {% if cta_text %}
          <!-- CTA -->
          <tr>
            <td style="padding:30px 48px 8px 48px;{% if template == 'promotional' %}text-align:center;{% endif %}">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" {% if template == 'promotional' %}align="center"{% endif %}>
                <tr>
                  <td style="border-radius:{% if template == 'promotional' %}9999px{% else %}{{ button_radius }}{% endif %};background-color:{{ button_color }};" bgcolor="{{ button_color }}">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ cta_url }}" style="height:{% if template == 'promotional' %}56px{% else %}50px{% endif %};v-text-anchor:middle;width:260px;" arcsize="50%" fillcolor="{{ button_color }}" strokecolor="{{ button_color }}"><w:anchorlock/><center style="color:{{ button_text_color }};font-family:sans-serif;font-size:15px;font-weight:700;">{{ cta_text }}</center></v:roundrect><![endif]-->
                    <a href="{{ cta_url }}" style="display:inline-block;padding:{% if template == 'promotional' %}17px 48px{% else %}15px 38px{% endif %};color:{{ button_text_color }};text-decoration:none;font-size:{% if template == 'promotional' %}16px{% else %}15px{% endif %};font-weight:700;border-radius:{% if template == 'promotional' %}9999px{% else %}{{ button_radius }}{% endif %};mso-hide:all;letter-spacing:0.2px;">{{ cta_text }}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {% endif %}

          {% if sender_name %}
          <!-- SIGNATURE -->
          <tr>
            <td style="padding:28px 48px 36px 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-left:3px solid {{ primary_color }};padding-left:14px;">
                    <p style="margin:0;color:{{ muted_color }};font-size:14px;line-height:1.6;">
                      Regards,<br/>
                      <strong style="color:{{ heading_color }};font-size:15px;">{{ sender_name }}</strong>
                      {% if sender_title %}<br/><span style="color:{{ muted_color }};font-size:13px;">{{ sender_title }}</span>{% endif %}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {% endif %}

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid rgba(0,0,0,0.08);font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:{{ bg_color }};padding:28px 40px;text-align:center;">
              <p style="margin:0 0 10px;color:{{ text_color }};font-size:12px;line-height:1.8;">
                <strong style="color:{{ heading_color }};">{{ company_name }}</strong>
                {% if company_address %}&nbsp;&middot;&nbsp;{{ company_address }}{% endif %}
              </p>
              <p style="margin:0 0 8px;color:{{ muted_color }};font-size:11px;line-height:1.7;">
                You are receiving this email because you opted in to communications from <strong>{{ company_name }}</strong>.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.7;">
                <a href="{{ unsubscribe_url }}" style="color:{{ text_color }};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="{{ privacy_url }}" style="color:{{ text_color }};text-decoration:underline;">Privacy Policy</a>
              </p>
              <p style="margin:14px 0 0;color:{{ muted_color }};font-size:10px;">&copy; {{ year }} {{ company_name }}. All rights reserved.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>"""


# ─── Recipe embedding (invisible HTML comment) ────────────────────────────
_RECIPE_RE = re.compile(r"<!--SENTINEL_RECIPE:(.*?)-->\s*", re.DOTALL)


def embed_recipe(html: str, recipe: dict) -> str:
    """Prepend a base64-encoded recipe as an invisible HTML comment."""
    blob = base64.b64encode(json.dumps(recipe).encode("utf-8")).decode("ascii")
    return f"<!--SENTINEL_RECIPE:{blob}-->\n{html}"


def extract_recipe(html: str) -> dict | None:
    """Recover the {content, style} recipe embedded in an email's HTML, if present."""
    if not html:
        return None
    match = _RECIPE_RE.search(html)
    if not match:
        return None
    try:
        return json.loads(base64.b64decode(match.group(1)).decode("utf-8"))
    except Exception:
        return None


def strip_recipe(html: str) -> str:
    """Remove the embedded recipe comment — call before sending to a provider."""
    return _RECIPE_RE.sub("", html or "").lstrip()


# ─── Rendering ────────────────────────────────────────────────────────────
def render_email(content: dict, style: dict | None = None) -> str:
    """Render the branded HTML email from a content dict + style token dict."""
    merged_style = {**DEFAULT_STYLE, **(style or {})}
    # button fallback → primary
    if not merged_style.get("button_color"):
        merged_style["button_color"] = merged_style["primary_color"]
    if not merged_style.get("accent_color"):
        merged_style["accent_color"] = merged_style["primary_color"]

    ctx = {
        **merged_style,
        "template":        content.get("template") or select_template(content.get("intent")),
        "subject":         content.get("subject", ""),
        "preheader":       content.get("preheader", ""),
        "intent_label":    _INTENT_LABELS.get(content.get("intent", ""), ""),
        "headline":        content.get("headline", content.get("subject", "")),
        "body_paragraphs": content.get("body_paragraphs", []),
        "details":         content.get("details", []),
        "cta_text":        content.get("cta_text", ""),
        "cta_url":         content.get("cta_url", "#"),
        "sender_name":     content.get("sender_name", ""),
        "sender_title":    content.get("sender_title", ""),
        "company_name":    content.get("company_name", "BridgingTech"),
        "logo_url":        content.get("logo_url", ""),
        "company_address": content.get("company_address", ""),
        "unsubscribe_url": content.get("unsubscribe_url", "#unsubscribe"),
        "privacy_url":     content.get("privacy_url", "#privacy"),
        "year":            datetime.now().year,
    }
    return _env.from_string(_TEMPLATE).render(**ctx)


def render_with_recipe(content: dict, style: dict | None = None) -> str:
    """Render the email and embed its recipe for later chat-driven restyling."""
    merged_style = {**DEFAULT_STYLE, **(style or {})}
    html = render_email(content, merged_style)
    return embed_recipe(html, {"content": content, "style": merged_style})


def plain_text_from_paragraphs(
    paragraphs: list[str], headline: str = "", cta_text: str = "", cta_url: str = ""
) -> str:
    """Generate a plain-text fallback from structured content."""
    parts: list[str] = []
    if headline:
        parts.append(headline)
        parts.append("=" * len(headline))
        parts.append("")
    parts.extend(paragraphs)
    if cta_text and cta_url:
        parts.append(f"\n{cta_text}: {cta_url}")
    return "\n\n".join(parts)


# ─── Backward-compatible wrappers ─────────────────────────────────────────
def render_branded_email(**kwargs) -> str:
    """Legacy flat-kwargs entry point — splits kwargs into content + style."""
    style_keys = set(DEFAULT_STYLE.keys())
    style = {k: v for k, v in kwargs.items() if k in style_keys}
    content = {k: v for k, v in kwargs.items() if k not in style_keys}
    return render_email(content, style)


def render_html(template_str: str, variables: dict) -> str:
    """Render an arbitrary Jinja2 HTML template string (backward compatibility)."""
    return _env.from_string(template_str).render(**variables)

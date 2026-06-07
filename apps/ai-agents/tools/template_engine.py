"""Jinja2-based HTML email template renderer."""
from jinja2 import Environment, BaseLoader, select_autoescape


_env = Environment(
    loader=BaseLoader(),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_html(template_str: str, variables: dict) -> str:
    """Render a Jinja2 HTML template string with the given variables."""
    tmpl = _env.from_string(template_str)
    return tmpl.render(**variables)

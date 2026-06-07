"""Heuristic deliverability scorer — no external API required."""
import re
from html.parser import HTMLParser


_SPAM_WORDS = {
    "free", "winner", "won", "cash", "prize", "urgent", "act now", "limited time",
    "click here", "buy now", "order now", "make money", "earn money", "extra income",
    "no cost", "no fees", "100%", "guarantee", "guaranteed", "risk-free",
    "credit card", "debt", "loan", "mortgage", "insurance", "investment",
    "congratulations", "selected", "exclusive deal", "special promotion",
}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._text: list[str] = []

    def handle_data(self, data: str) -> None:
        self._text.append(data)

    def get_text(self) -> str:
        return " ".join(self._text)


def _extract_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return parser.get_text()


def score_deliverability(subject: str, body_html: str) -> dict:
    """Return a deliverability report with score 0-100 and diagnostics."""
    warnings: list[str] = []
    deductions = 0

    # Subject checks
    if len(subject) > 60:
        warnings.append("Subject line exceeds 60 characters — may be truncated")
        deductions += 5
    caps_ratio = sum(1 for c in subject if c.isupper()) / max(len(subject), 1)
    if caps_ratio > 0.4:
        warnings.append("Subject has excessive caps — spam trigger")
        deductions += 15
    if subject.count("!") > 1:
        warnings.append("Multiple exclamation marks in subject — spam trigger")
        deductions += 10

    subject_lower = subject.lower()
    for word in _SPAM_WORDS:
        if word in subject_lower:
            warnings.append(f"Spam trigger word in subject: '{word}'")
            deductions += 8
            break

    # Body checks
    plain_text = _extract_text(body_html)
    link_count = len(re.findall(r"https?://", body_html))
    if link_count > 5:
        warnings.append(f"High link count ({link_count}) — may trigger spam filters")
        deductions += 10

    html_len = len(body_html)
    text_len = len(plain_text)
    if html_len > 0 and text_len / html_len < 0.1:
        warnings.append("Very low text-to-HTML ratio — use more plain text")
        deductions += 10

    body_lower = plain_text.lower()
    spam_hits = sum(1 for w in _SPAM_WORDS if w in body_lower)
    if spam_hits >= 3:
        warnings.append(f"{spam_hits} spam trigger words found in body")
        deductions += min(spam_hits * 3, 20)

    if "unsubscribe" not in body_lower:
        warnings.append("No unsubscribe link detected — required for CAN-SPAM/GDPR")
        deductions += 15

    score = max(0, 100 - deductions)

    if score >= 80:
        inbox_prediction = "primary"
    elif score >= 55:
        inbox_prediction = "promotions"
    else:
        inbox_prediction = "spam"

    recommendations = []
    if score < 75:
        recommendations.append("Run /optimize-email to improve deliverability score")
    if "unsubscribe" not in body_lower:
        recommendations.append("Add a visible unsubscribe link in the email footer")

    return {
        "score": score,
        "inbox_prediction": inbox_prediction,
        "warnings": warnings,
        "recommendations": recommendations,
    }

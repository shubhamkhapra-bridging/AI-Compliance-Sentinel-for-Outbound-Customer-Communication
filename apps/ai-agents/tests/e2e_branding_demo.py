"""End-to-end demo: product + email-context → branded, type-specific template.

Runs the real DraftPipeline (live LLM) for several product/intent scenarios and
verifies that product branding (color), the CAN-SPAM address, the unsubscribe
footer, and the intent-driven template variant all land in the rendered email.

Run:  python tests/e2e_branding_demo.py
"""
import asyncio
import re

from orchestrator.agent_orchestrator import DraftPipeline

ADDRESS = "BridgingTech Inc., 18200 Von Karman Ave, Suite 600, Irvine, CA 92612, USA"

# Mirrors what apps/api/src/routes/conversations.ts sends per product.
SCENARIOS = [
    {
        "name": "Denefits · promotional",
        "expect_template": "promotional",
        "primary": "#16A34A",
        "payload": {
            "productSlug": "denefits", "companyName": "Denefits",
            "brandColors": {"primary": "#16A34A", "accent": "#15803D", "button": "#16A34A"},
            "companyAddress": ADDRESS, "websiteUrl": "",
            "userMessage": "Create a promotional email offering 0% interest financing for 6 months on dental treatment plans. Make it exciting.",
        },
    },
    {
        "name": "Recuvery · payment reminder",
        "expect_template": "payment",
        "primary": "#EA580C",
        "payload": {
            "productSlug": "recuvery", "companyName": "Recuvery",
            "brandColors": {"primary": "#EA580C", "accent": "#C2410C", "button": "#EA580C"},
            "companyAddress": ADDRESS, "websiteUrl": "",
            "userMessage": "Remind the customer their payment of $420 is overdue and due by June 30. Be firm but respectful and FDCPA-compliant.",
        },
    },
    {
        "name": "Practina · follow-up",
        "expect_template": "standard",
        "primary": "#7C3AED",
        "payload": {
            "productSlug": "practina", "companyName": "Practina",
            "brandColors": {"primary": "#7C3AED", "accent": "#6D28D9", "button": "#7C3AED"},
            "companyAddress": ADDRESS, "websiteUrl": "",
            "userMessage": "Follow up with a dental clinic about our AI social media marketing service after our call last week.",
        },
    },
]

MARKERS = {
    "promotional": "PROMOTIONAL HERO",
    "payment": "PAYMENT EMPHASIS CARD",
    "notice": "COMPLIANCE NOTICE BANNER",
    "standard": "HEADLINE (standard / payment)",
}


def check(label: str, ok: bool) -> bool:
    print(f"      {'✅' if ok else '❌'} {label}")
    return ok


async def main() -> None:
    pipeline = DraftPipeline()
    passed = 0
    total = 0

    for s in SCENARIOS:
        print(f"\n── {s['name']} " + "─" * (52 - len(s["name"])))
        try:
            result = await asyncio.wait_for(pipeline.run(s["payload"]), timeout=90)
        except Exception as exc:  # noqa: BLE001
            print(f"      ❌ pipeline error: {exc}")
            total += 1
            continue

        html = result["body_html"]
        intent = (result.get("intent") or {}).get("intent", "?")
        primary_used = result.get("brand", {}).get("primaryColor", "")
        report = result.get("compliance_report", {})

        print(f"      subject : {result['subject']}")
        print(f"      intent  : {intent}   → primary color used: {primary_used}")
        print(f"      compliance: passed={report.get('passed')} risk={report.get('risk_score')}")

        results = [
            check(f"product brand color {s['primary']} in email",
                  s["primary"].lower() in html.lower()),
            check("CAN-SPAM physical address in footer", "Von Karman" in html),
            check("unsubscribe link present", "unsubscribe" in html.lower()),
            check(f"expected layout variant '{s['expect_template']}'",
                  MARKERS[s["expect_template"]] in html),
        ]
        passed += sum(results)
        total += len(results)

    print("\n" + "═" * 56)
    print(f"  RESULT: {passed}/{total} branding/context checks passed")
    print("═" * 56)


if __name__ == "__main__":
    asyncio.run(main())

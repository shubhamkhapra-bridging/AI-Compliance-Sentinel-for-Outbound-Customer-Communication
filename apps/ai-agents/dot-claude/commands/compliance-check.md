# Compliance Check

Validate an email draft against regulatory requirements (GDPR, CAN-SPAM, CASL), brand guidelines, and internal communication policies.

## Usage

```
/compliance-check [email_type]
```

`email_type` is optional: `marketing`, `transactional`, `sales`, `support`, `internal` (default: auto-detect)

## What Is Checked

### Regulatory Compliance

**CAN-SPAM (US)**
- Physical mailing address present
- Clear sender identification (From name/email)
- Honest subject line (no deceptive headers)
- Unsubscribe mechanism present and functional
- Opt-out honored within 10 business days

**GDPR (EU)**
- Explicit consent basis documented (for marketing)
- Data processing disclosure where required
- Right to opt-out clearly visible
- No pre-ticked consent boxes referenced
- DPA contact available if required

**CASL (Canada)**
- Express or implied consent verified
- Sender identification complete
- Unsubscribe mechanism present

### Brand Compliance
- Tone matches brand voice guidelines (professional / no slang)
- No competitor brand names used without clearance
- Logo and trademark usage follows brand book
- Approved CTA phrases used
- No unapproved claims (superlatives like "best", "guaranteed")

### Content Policy
- No discriminatory language
- No misleading statistics or fabricated social proof
- No false urgency ("Only 2 left!" when untrue)
- No aggressive upsell tactics violating internal policy
- Attachments scanned for malware (if applicable)

### Grammar & Quality
- Spelling errors
- Grammar issues (passive voice overuse, run-on sentences)
- Reading level appropriate for audience
- Consistent tense and person throughout

## Output Format

```
COMPLIANCE REPORT
=================
Email Type        : Marketing
Overall Status    : ⚠ WARNINGS (2 issues found)

REGULATORY
  CAN-SPAM        : ✅ Passed
  GDPR            : ⚠ Warning — no unsubscribe link detected
  CASL            : ✅ Passed

BRAND COMPLIANCE
  Tone            : ✅ Professional
  Claims          : ⚠ "Best-in-class" detected — requires substantiation or removal
  CTA             : ✅ Approved phrase used

CONTENT POLICY
  ✅ No discriminatory language
  ✅ No false urgency detected
  ✅ No misleading statistics

GRAMMAR & QUALITY
  Spelling Errors : 0
  Grammar Issues  : 1 — passive voice in paragraph 2
  Reading Level   : Grade 9 ✅

REQUIRED ACTIONS (must fix before sending)
  1. Add unsubscribe link — GDPR non-compliant without it
  2. Remove or substantiate "Best-in-class" claim

RECOMMENDATIONS (optional)
  1. Rewrite passive voice in paragraph 2 for stronger impact
```

## Failure Behavior

If `overall_status = FAILED`, the email is quarantined and cannot proceed to the `SendingAgent`. Issues must be resolved and the check re-run.

Warnings are non-blocking but logged to the audit trail.

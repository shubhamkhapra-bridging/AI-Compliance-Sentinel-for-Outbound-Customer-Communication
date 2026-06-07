# Check Deliverability

Score an email draft for inbox placement, spam risk, sender reputation, and deliverability health.

## Usage

```
/check-deliverability
```

Run with no arguments — Claude will prompt for the email subject and body interactively, or read from the current file if an `.eml` or `.txt` file is open.

## What It Checks

### Spam Analysis
- SpamAssassin-style scoring (target: < 3.0)
- Spam trigger word detection in subject and body
- Exclamation mark density
- ALL CAPS ratio
- Deceptive link patterns

### Authentication
- SPF record valid for sender domain
- DKIM signature configuration
- DMARC policy in place (p=reject or p=quarantine)
- BIMI logo record (optional)

### Content Analysis
- Text-to-HTML ratio (target: > 60% text)
- Image count and alt text presence
- Link count (target: < 3 external links per email)
- Unsubscribe link present (required for bulk)
- Physical address present (CAN-SPAM)

### Sender Reputation
- Domain age and reputation score
- IP reputation (if custom SMTP)
- Blacklist check (Spamhaus, MXToolbox, Barracuda)
- Historical bounce rate for sender

### Inbox Placement Prediction
- Primary Inbox probability
- Promotions Tab probability
- Spam/Junk probability

## Output Format

```
DELIVERABILITY REPORT
=====================
Overall Score         : 82/100  ✅

Spam Score            : 1.4/10  ✅  (target < 3.0)
Authentication        : SPF ✅  DKIM ✅  DMARC ✅
Text/HTML Ratio       : 68%     ✅
Link Count            : 2       ✅
Unsubscribe Link      : ✅ Present
CAN-SPAM Address      : ✅ Present

Blacklist Status      : Clean   ✅
Domain Reputation     : 94/100  ✅

Inbox Placement Prediction
  Primary Inbox       : 78%
  Promotions          : 18%
  Spam                : 4%

Warnings
  ⚠ Subject contains "Free" — consider rephrasing
  ⚠ 3 images detected with missing alt text

Recommendations
  1. Replace "Free trial" in subject with "Try it at no cost"
  2. Add alt text to all images
  3. Reduce exclamation marks in body (found: 4, recommended: ≤ 1)
```

## Auto-Fix

After the report, Claude offers: "Run `/optimize-email` to apply recommendations automatically."

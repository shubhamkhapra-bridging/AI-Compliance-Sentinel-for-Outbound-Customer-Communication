# Generate Email

Run a user message through the full 10-agent AI pipeline and produce a ready-to-send email.

## Usage

```
/generate-email <natural language instruction>
```

## Examples

```
/generate-email Send a follow-up email to John regarding the pending proposal
/generate-email Write a sales outreach email to a fintech startup CEO
/generate-email Draft a customer support reply acknowledging a billing complaint
```

## Steps

1. Parse the argument as the `user_message` input.

2. Call `IntentAgent` to extract:
   - `intent` (follow_up | sales_outreach | support | announcement | ...)
   - `entities` (recipient name, company, context)
   - `tone` (professional | friendly | executive | urgent)
   - `goal` (what outcome the sender wants)

3. Call `RecipientAgent` with extracted entities to build a recipient profile:
   - Contact history
   - Preferred communication style
   - Engagement score
   - Time zone / best send time

4. Call `TemplateAgent` to rank and select the best-fit template:
   - Filter by intent category
   - Score by historical open/reply rate
   - Return top 3 candidates with scores

5. Call `GenerationAgent` with intent + recipient profile + selected template:
   - Generate email draft (subject + body)
   - Apply personalization tokens
   - Match requested tone

6. Call `ComplianceAgent` on the draft:
   - Check GDPR / CAN-SPAM / brand guidelines
   - Validate grammar and tone
   - If failed → show issues and stop

7. Call `DeliverabilityAgent` on the draft:
   - Spam score analysis
   - Subject line assessment
   - Link/image ratio check
   - Return `deliverability_score` (0–100) and `inbox_placement_prediction`

8. If `deliverability_score < 75`, call `OptimizationAgent`:
   - Improve subject line
   - Remove spam trigger words
   - Rebalance text/image ratio
   - Return revised draft

9. Display the final email:

```
SUBJECT: <subject>

<body>

---
Deliverability Score : <score>/100
Inbox Prediction     : <Primary | Promotions | Spam>
Compliance Status    : ✅ Passed
Template Used        : <template_name> (score: <X>)
Best Send Time       : <datetime>
```

10. Ask: "Send now, schedule, or make changes?"

## Output Format

Always show the final email in a fenced block with metadata below it.

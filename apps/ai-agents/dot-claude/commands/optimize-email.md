# Optimize Email

Run the OptimizationAgent on an email draft to improve subject line, content, and send timing for maximum deliverability and engagement.

## Usage

```
/optimize-email [focus]
```

`focus` is optional. Options: `subject`, `body`, `timing`, `all` (default: `all`)

## Examples

```
/optimize-email
/optimize-email subject
/optimize-email timing
/optimize-email body
```

## Steps

1. Read the current email draft from context (or prompt for subject + body if not present).

2. Run `DeliverabilityAgent` to get the baseline score and issue list.

3. Run `OptimizationAgent` with the following sub-tasks based on `focus`:

   **Subject Line Optimization** (`focus: subject | all`)
   - Generate 5 alternative subject lines using LLM
   - Score each variant for: open rate prediction, spam risk, curiosity gap, urgency
   - Rank and recommend the best 3
   - Show A/B test suggestion

   **Body Optimization** (`focus: body | all`)
   - Improve readability score (target Flesch-Kincaid grade 8–10)
   - Shorten sentences > 25 words
   - Remove spam trigger words
   - Strengthen CTA (clear, single, above fold)
   - Fix passive voice where possible
   - Balance text/image ratio

   **Send Time Optimization** (`focus: timing | all`)
   - Load recipient's historical open-time data from `RecipientAgent`
   - Cross-reference with industry benchmarks for recipient's industry/timezone
   - Recommend optimal send day + time window
   - Show confidence interval

4. Display a before/after diff for subject and body changes.

5. Show updated deliverability score post-optimization.

## Output Format

```
OPTIMIZATION REPORT
===================
Baseline Score    : 61/100
Optimized Score   : 89/100  (+28 points)

SUBJECT LINE
Before: "Special offer just for you!!!"
After:  "Your exclusive access to [Product] — expires Friday"

Alternatives:
  A) "One thing you might be missing in your workflow" — predicted open rate: 34%
  B) "Quick question about [Company]" — predicted open rate: 41%  ← Recommended
  C) "Your exclusive access to [Product] — expires Friday" — predicted open rate: 38%

BODY CHANGES
  - Removed 3 spam trigger words: "guaranteed", "free", "act now"
  - Shortened 2 sentences > 25 words
  - Moved CTA above the fold
  - Added alt text to 2 images

SEND TIMING
  Recommended: Tuesday 10:00–10:30 AM (recipient's local time)
  Confidence: 82%
  Basis: Recipient's last 6 opens were between 9:45–11:00 AM on weekdays

Apply changes? [yes / no / show diff]
```

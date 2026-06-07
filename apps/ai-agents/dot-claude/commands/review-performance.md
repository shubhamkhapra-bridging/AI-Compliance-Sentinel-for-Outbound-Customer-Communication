# Review Performance

Summarize AI agent performance metrics, email engagement analytics, and deliverability trends for a given period.

## Usage

```
/review-performance [period] [agent_name]
```

`period`: `today`, `7d`, `30d`, `90d` (default: `7d`)
`agent_name`: filter to a single agent (optional)

## Examples

```
/review-performance
/review-performance 30d
/review-performance 7d compliance
/review-performance today
```

## Steps

1. Query ClickHouse analytics store for the specified period.
2. Aggregate metrics across all agents (or the specified one).
3. Render a structured performance summary.

## Output Format

```
PERFORMANCE REPORT — Last 7 Days
==================================

EMAIL METRICS
  Emails Sent           : 14,832
  Delivered             : 14,601  (98.4%)
  Opened (Unique)       : 5,103   (34.9% open rate)
  Clicked               : 1,247   (8.5% CTR)
  Replied               : 389     (2.6% reply rate)
  Hard Bounces          : 47      (0.32%)
  Soft Bounces          : 184     (1.24%)
  Unsubscribes          : 23      (0.16%)
  Spam Complaints       : 3       (0.02%) ✅

DELIVERABILITY
  Avg Deliverability Score : 84/100
  Inbox Placement Rate     : 91.2%
  Promotions Rate          : 7.1%
  Spam Rate                : 1.7%

AGENT PERFORMANCE
  IntentAgent
    Avg Latency           : 340ms
    Success Rate          : 99.8%
    Errors                : 3

  GenerationAgent
    Avg Latency           : 1,240ms
    Success Rate          : 99.5%
    Top Tone Used         : Professional (62%)

  ComplianceAgent
    Emails Quarantined    : 12
    Top Failure Reason    : Missing unsubscribe link (8)

  OptimizationAgent
    Emails Optimized      : 3,401
    Avg Score Improvement : +19 points

  LearningAgent
    Last Run              : 2026-06-06 02:00 UTC
    Templates Updated     : 7
    Subject Lines Improved: 12

TOP PERFORMING TEMPLATES
  1. follow_up_v3         — 41.2% open rate
  2. sales_outreach_v2    — 38.8% open rate
  3. welcome_series_v4    — 55.1% open rate

RECOMMENDATIONS
  ⚠ Soft bounce rate trending up — review mailing list hygiene
  ✅ Spam complaint rate within safe threshold (< 0.08%)
  ℹ Consider A/B testing subject lines for sales_outreach — CTR has dropped 3% vs last period
```

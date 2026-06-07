# BridgingTech AI Email Platform — Complete Data Model

> **Document scope:** End-to-end ER diagrams and table-by-table explanations for the entire email-system database, organized into **10 logical domains**.
> Every table has 3 things: **What** it is, **Why** it exists, and **How** the system uses it.
>
> **Target audience:** Engineers building this system at BridgingTech.
> **Storage choice:** Email-system DB is a new MySQL or PostgreSQL instance (separate from product DBs).
> **Vector store:** Qdrant (already self-hosted).

---

## Table of Contents

1. [Conventions](#conventions)
2. [Domain 1 — Identity & Access](#domain-1--identity--access)
3. [Domain 2 — Products & Brand](#domain-2--products--brand)
4. [Domain 3 — Contact Hub](#domain-3--contact-hub)
5. [Domain 4 — Templates](#domain-4--templates)
6. [Domain 5 — Conversations & Drafts](#domain-5--conversations--drafts)
7. [Domain 6 — Campaigns & Segments](#domain-6--campaigns--segments)
8. [Domain 7 — Risk & Approval](#domain-7--risk--approval)
9. [Domain 8 — Sending](#domain-8--sending)
10. [Domain 9 — Tracking & Events](#domain-9--tracking--events)
11. [Domain 10 — AI Ops, Compliance & Audit](#domain-10--ai-ops-compliance--audit)
12. [Cross-Domain Relationships](#cross-domain-relationships)
13. [Indexing & Performance Notes](#indexing--performance-notes)
14. [Setup Order](#setup-order)

---

## Conventions

| Convention | Standard |
|---|---|
| Primary key | `id` (UUID v4, never auto-increment) |
| Timestamps | `created_at`, `updated_at`, `deleted_at` (soft delete) — all UTC |
| Foreign keys | `<table_singular>_id` (e.g., `user_id`, `product_id`) |
| Enums | Stored as `VARCHAR` with a CHECK constraint (portable across MySQL/PG) |
| JSON columns | Stored as `JSON` type (MySQL 5.7+, PG native) |
| Encrypted columns | Suffix `_encrypted` — AES-256-GCM, key from KMS |
| Money | Stored as `DECIMAL(12,4)` (4 decimals for fractional cents in LLM costs) |
| Booleans | Default to `FALSE`, never `NULL` |

All tables include `created_at`, `updated_at` (and `deleted_at` where applicable) — these are omitted from per-table specs to reduce noise.

---

## Domain 1 — Identity & Access

**Purpose:** Manage BridgingTech employees, teams, and what they're allowed to do.
**Key question this domain answers:** *"Can this user send a Denefits email and approve a Recuvery email?"*

### ER Diagram

```mermaid
erDiagram
    USERS ||--o{ USER_TEAMS : "member of"
    TEAMS ||--o{ USER_TEAMS : "has"
    USERS ||--o{ USER_ROLES : "has"
    ROLES ||--o{ USER_ROLES : "granted as"
    TEAMS ||--o{ PRODUCT_TEAM_ACCESS : "can access"
    PRODUCTS ||--o{ PRODUCT_TEAM_ACCESS : "accessible by"
    USERS {
        uuid id PK
        string email UK
        string full_name
        string sso_provider
        string sso_subject_id
        bool active
        timestamp last_login_at
    }
    TEAMS {
        uuid id PK
        string name UK
        string description
        uuid default_product_id FK
        uuid manager_user_id FK
    }
    USER_TEAMS {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        string role_in_team
    }
    ROLES {
        uuid id PK
        string name UK
        json permissions
        bool is_system_role
    }
    USER_ROLES {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        string scope_type
        uuid scope_id
        uuid granted_by FK
    }
    PRODUCT_TEAM_ACCESS {
        uuid id PK
        uuid team_id FK
        uuid product_id FK
        bool can_send_1to1
        bool can_send_bulk
        bool can_approve
    }
```

### Tables

#### `users`
- **What:** BridgingTech employees authorized to use the platform.
- **Why:** Every action in the system attributes to a user (audit, approval routing, sending-from identity).
- **How:** Auto-provisioned via SSO (Google Workspace + Azure AD). On first login, a user row is created (JIT). The `sso_provider` + `sso_subject_id` pair is the identity anchor.

#### `teams`
- **What:** Departments/groups (e.g., "Denefits Sales", "Practina Marketing", "Recuvery Collections").
- **Why:** Used to (a) suggest default product context, (b) route approvals to a team's manager, (c) grant product access in bulk.
- **How:** Admin creates teams via admin panel. Each team has a `default_product_id` so a Denefits Sales rep auto-defaults to Denefits when composing.

#### `user_teams`
- **What:** Many-to-many join — a user can belong to multiple teams.
- **Why:** Real life: someone might be in "Denefits Sales" + "Cross-Product Marketing".
- **How:** Admin assigns. `role_in_team` distinguishes "member" vs "lead" vs "approver".

#### `roles`
- **What:** System roles: `admin`, `manager`, `approver`, `sender`, `viewer`.
- **Why:** RBAC — different permissions for different jobs.
- **How:** Seeded at install. `permissions` JSON lists capabilities (e.g., `["email.send", "email.approve", "brand_kit.edit"]`).

#### `user_roles`
- **What:** Assignment of roles to users, **scoped** to global / team / product.
- **Why:** Same user can be `admin` globally but `viewer` for a specific product they shouldn't access.
- **How:** Admin grants. `scope_type` ∈ {`global`, `team`, `product`}, `scope_id` is the FK if scoped.

#### `product_team_access`
- **What:** Per-product permissions for each team.
- **Why:** Denefits Sales should NOT be able to send Credee emails by default.
- **How:** Three boolean flags: `can_send_1to1`, `can_send_bulk`, `can_approve`. Admin configures.

---

## Domain 2 — Products & Brand

**Purpose:** Central registry of the 7 BridgingTech products + their brand identities.
**Key question:** *"What colors, fonts, logo, tone, and compliance rules apply to a Denefits email?"*

### ER Diagram

```mermaid
erDiagram
    PRODUCTS ||--|| BRAND_KITS : "has"
    PRODUCTS ||--o{ PRODUCT_COMPLIANCE_RULES : "must follow"
    PRODUCTS ||--o{ BRAND_KIT_VERSIONS : "history"
    PRODUCTS {
        uuid id PK
        string slug UK
        string name
        string website_url
        string sending_domain
        bool active
    }
    BRAND_KITS {
        uuid id PK
        uuid product_id FK
        json colors
        json typography
        string logo_url
        string logo_dark_url
        string footer_html
        json voice
        int version
        bool active
    }
    BRAND_KIT_VERSIONS {
        uuid id PK
        uuid brand_kit_id FK
        int version_number
        json snapshot
        uuid edited_by FK
        string changelog
    }
    PRODUCT_COMPLIANCE_RULES {
        uuid id PK
        uuid product_id FK
        string regulation
        json required_footers
        json forbidden_phrases
        json rules
    }
```

### Tables

#### `products`
- **What:** The 7 BridgingTech products (Denefits, Practina, Lendee, CoolCredit, Credee, FinanceMutual, Recuvery).
- **Why:** Foreign key target for nearly every other table. Single source of truth for product metadata.
- **How:** Seeded at install. `slug` is the URL-safe identifier (`denefits`, `credee`). `sending_domain` is the from-domain (e.g., `mail.denefits.com`).

#### `brand_kits`
- **What:** The brand identity of each product (colors, fonts, logo, tone-of-voice, footer).
- **Why:** Drives auto-theming. A single base email template + 7 brand kits = 7 distinct-looking emails.
- **How:** Auto-extracted from product website by the Brand Extraction script (Sprint 1), then manually curated. `colors` JSON example:
```json
{
  "primary": "#0066FF",
  "secondary": "#F4F7FB",
  "accent": "#00C49A",
  "text": "#1A1F36",
  "cta_bg": "#0066FF",
  "cta_text": "#FFFFFF"
}
```
  `voice` JSON example:
```json
{
  "tone": ["professional", "trustworthy"],
  "forbidden_words": ["guaranteed", "risk-free"],
  "reading_level": "grade 8"
}
```

#### `brand_kit_versions`
- **What:** History of brand kit edits.
- **Why:** Audit trail for marketing/design changes; ability to roll back.
- **How:** A trigger or service hook snapshots `brand_kits` row on every change.

#### `product_compliance_rules`
- **What:** Regulatory rules per product (HIPAA for FinanceMutual, FDCPA for Recuvery, PCI for Denefits/Credee, GDPR for EU contacts).
- **Why:** Compliance Agent uses these to validate emails before send.
- **How:** Created by legal/compliance team. `rules` JSON contains structured checks (e.g., `{"must_include": "unsubscribe_link", "max_links": 5}`).

---

## Domain 3 — Contact Hub

**Purpose:** Unify recipient data from all 7 product MySQL DBs into one queryable source.
**Key question:** *"What's Mr. Sharma's email, which product is he in, what's his lead stage, and what's our email history with him?"*

### ER Diagram

```mermaid
erDiagram
    PRODUCT_DB_CONNECTIONS ||--o{ SCHEMA_MAPPINGS : "has"
    PRODUCT_DB_CONNECTIONS ||--o{ SYNC_JOBS : "runs"
    PRODUCTS ||--|| PRODUCT_DB_CONNECTIONS : "configured for"
    PRODUCTS ||--o{ CONTACTS_SYNCED : "has"
    CONTACTS_SYNCED ||--|| CONTACT_HISTORY_CACHE : "summarized in"
    PRODUCT_DB_CONNECTIONS {
        uuid id PK
        uuid product_id FK
        string db_host
        int db_port
        string db_name
        string db_username
        string db_password_encrypted
        string sync_cron
        timestamp last_synced_at
        string status
    }
    SCHEMA_MAPPINGS {
        uuid id PK
        uuid product_db_connection_id FK
        string source_table
        json column_mapping
        string custom_transform_sql
        int version
        bool active
    }
    SYNC_JOBS {
        uuid id PK
        uuid product_db_connection_id FK
        timestamp started_at
        timestamp finished_at
        int rows_synced
        int rows_failed
        string status
        text error_log
    }
    CONTACTS_SYNCED {
        uuid id PK
        uuid product_id FK
        string source_id
        string email
        string full_name
        string phone
        string company_name
        string lead_stage
        json custom_attributes
        timestamp last_synced_at
        string content_hash
    }
    CONTACT_HISTORY_CACHE {
        uuid contact_id PK
        timestamp last_email_sent_at
        timestamp last_opened_at
        int total_sent
        int total_opens
        int total_clicks
        int total_replies
    }
```

### Tables

#### `product_db_connections`
- **What:** Connection details for each of the 7 product MySQL DBs (read-only credentials).
- **Why:** System needs to physically connect to product DBs to sync contacts.
- **How:** Admin configures once per product. `db_password_encrypted` is AES-256-GCM. `sync_cron` = "0 * * * *" (hourly).

#### `schema_mappings`
- **What:** Per-product mapping of "product DB columns → unified contact schema". This is the **adapter pattern**.
- **Why:** Each product DB has different schemas — this translates them to a common format.
- **How:** `column_mapping` JSON example for Denefits:
```json
{
  "source_id":     "merchants.id",
  "email":         "merchants.contact_email",
  "full_name":     "merchants.business_name",
  "phone":         "merchants.phone",
  "company_name":  "merchants.business_name",
  "lead_stage":    "merchants.funnel_stage"
}
```
Sync service runs `SELECT col1, col2 FROM source_table` and upserts into `contacts_synced`.

#### `sync_jobs`
- **What:** Log of each sync execution.
- **Why:** Observability — "when did the last Denefits sync run, did it fail, how many rows?".
- **How:** New row per sync run. Status ∈ {`running`, `success`, `failed`}.

#### `contacts_synced`
- **What:** The unified contact records — one row per (product, source_id).
- **Why:** Single table to query when composing an email. Brand kit + contact = ready to generate.
- **How:** Sync job upserts based on `(product_id, source_id)`. `content_hash` detects changes to skip re-embedding.

#### `contact_history_cache`
- **What:** Pre-computed engagement summary per contact.
- **Why:** Avoid expensive `COUNT(*)` queries every time you compose an email.
- **How:** Updated by event processor whenever a new `email_events` row arrives.

---

## Domain 4 — Templates

**Purpose:** Reusable email templates, versioned, with performance tracking.
**Key question:** *"What templates exist for Denefits, ranked by performance, that fit a 'payment reminder' intent?"*

### ER Diagram

```mermaid
erDiagram
    PRODUCTS ||--o{ EMAIL_TEMPLATES : "has"
    EMAIL_TEMPLATES ||--o{ TEMPLATE_VERSIONS : "evolves through"
    EMAIL_TEMPLATES ||--o{ TEMPLATE_PERFORMANCE : "measured by"
    EMAIL_TEMPLATES {
        uuid id PK
        string slug
        string name
        string category
        uuid product_id FK
        text subject_template
        text body_html_template
        text body_text_template
        json design_tokens_used
        bool active
        uuid created_by FK
    }
    TEMPLATE_VERSIONS {
        uuid id PK
        uuid template_id FK
        int version_number
        text subject_template
        text body_html_template
        string changelog
        bool is_current
        uuid created_by FK
    }
    TEMPLATE_PERFORMANCE {
        uuid id PK
        uuid template_id FK
        uuid product_id FK
        date period_start
        date period_end
        int sends
        int opens
        int clicks
        int replies
        int conversions
        decimal open_rate
        decimal click_rate
        decimal reply_rate
        decimal performance_score
    }
```

### Tables

#### `email_templates`
- **What:** Reusable templates — "welcome", "follow-up", "payment reminder", "demo invite", etc.
- **Why:** Don't reinvent the wheel for every email. Consistent voice. Performance learning.
- **How:** Subject/body use Handlebars syntax: `Hi {{contact.first_name}}, regarding {{intent.topic}}...`. Design tokens `{{brand.colors.primary}}` are filled at render time.

#### `template_versions`
- **What:** Version history of a template.
- **Why:** Edit safely — if v3 underperforms v2, roll back.
- **How:** Save creates a new version, sets old version `is_current = FALSE`.

#### `template_performance`
- **What:** Aggregated per-template metrics over time periods.
- **Why:** Powers the Template Selection Agent's ranking (pick best-performing template that fits intent).
- **How:** Rolled up daily by analytics job. `performance_score` = weighted blend (e.g., `0.3 * open_rate + 0.4 * click_rate + 0.3 * reply_rate`).

---

## Domain 5 — Conversations & Drafts

**Purpose:** Capture the AI chat sessions and the drafts they produce.
**Key question:** *"What did the user ask, what did the AI generate, what version is current, and what was the cost?"*

### ER Diagram

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : "starts"
    CONVERSATIONS ||--o{ CONVERSATION_MESSAGES : "contains"
    CONVERSATIONS ||--o{ EMAIL_DRAFTS : "produces"
    PRODUCTS ||--o{ CONVERSATIONS : "scoped to"
    CONTACTS_SYNCED ||--o{ CONVERSATIONS : "target of"
    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        uuid recipient_contact_id FK
        string status
        timestamp started_at
        timestamp last_activity_at
    }
    CONVERSATION_MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        string agent_invoked
        timestamp created_at
    }
    EMAIL_DRAFTS {
        uuid id PK
        uuid conversation_id FK
        int version
        text subject
        text body_html
        text body_text
        uuid template_id FK
        string generated_by_agent
        string llm_provider
        string llm_model
        decimal llm_cost_usd
        bool is_current
    }
```

### Tables

#### `conversations`
- **What:** A chat session between a user and the AI.
- **Why:** Multi-turn refinement requires context: "make it shorter" needs to know what "it" is.
- **How:** Created when user opens new chat. `status` ∈ {`active`, `sent`, `abandoned`}.

#### `conversation_messages`
- **What:** Individual messages in the conversation (user prompts + AI responses).
- **Why:** Preserves chat history for context window assembly and audit.
- **How:** Append-only. `role` ∈ {`user`, `assistant`, `system`}. `agent_invoked` records which agent generated assistant replies.

#### `email_drafts`
- **What:** AI-generated email drafts within a conversation.
- **Why:** Every "rewrite", "make shorter", "change tone" creates a new draft — needed to compare and revert.
- **How:** New row per generation. Latest draft has `is_current = TRUE`. Cost is tracked per draft for billing/reporting.

---

## Domain 6 — Campaigns & Segments

**Purpose:** Bulk email campaigns to filtered audience segments.
**Key question:** *"Send the Q4 product update to all Registered users of Denefits who haven't engaged in 30 days."*

### ER Diagram

```mermaid
erDiagram
    USERS ||--o{ CAMPAIGNS : "creates"
    PRODUCTS ||--o{ CAMPAIGNS : "scoped to"
    EMAIL_TEMPLATES ||--o{ CAMPAIGNS : "uses"
    SEGMENTS ||--o{ CAMPAIGNS : "targets"
    CAMPAIGNS ||--o{ CAMPAIGN_RECIPIENTS : "sent to"
    CONTACTS_SYNCED ||--o{ CAMPAIGN_RECIPIENTS : "receives"
    CAMPAIGNS {
        uuid id PK
        string name
        uuid product_id FK
        uuid template_id FK
        uuid segment_id FK
        timestamp scheduled_send_at
        string status
        int total_recipients
        uuid created_by FK
    }
    SEGMENTS {
        uuid id PK
        string name
        uuid product_id FK
        json filter_definition
        int last_estimated_size
        uuid created_by FK
    }
    CAMPAIGN_RECIPIENTS {
        uuid id PK
        uuid campaign_id FK
        uuid contact_id FK
        string status
        timestamp sent_at
        uuid email_id FK
        string skip_reason
    }
```

### Tables

#### `campaigns`
- **What:** Bulk send job — one template, one segment, scheduled at a time.
- **Why:** Marketing team needs to send to thousands of contacts at once.
- **How:** Created via campaign builder UI. `status` ∈ {`draft`, `scheduled`, `sending`, `sent`, `cancelled`, `failed`}. Worker picks up `scheduled` campaigns at `scheduled_send_at`.

#### `segments`
- **What:** Saved recipient filter definitions.
- **Why:** Reusable — "L2 leads in Denefits from last 30 days" can be saved and reused.
- **How:** `filter_definition` JSON:
```json
{
  "product_id": "denefits",
  "lead_stage": ["L2", "L3"],
  "created_after": "2025-09-01",
  "last_email_opened_within_days": 30,
  "exclude_unsubscribed": true
}
```
Translated to SQL by Segment Resolver service.

#### `campaign_recipients`
- **What:** Per-recipient row for each campaign — who got the email, when, what was the outcome.
- **Why:** Critical for tracking — "we sent campaign X to 10,000 people; 9,873 actually got sent, 127 were skipped because of bounce history".
- **How:** Populated when campaign starts. `skip_reason` ∈ {`unsubscribed`, `bounced_previously`, `missing_email`, `compliance_block`}.

---

## Domain 7 — Risk & Approval

**Purpose:** Classify outgoing emails by risk and route high-risk ones to human approvers.
**Key question:** *"Is this email safe to auto-send, or does a manager need to approve it?"*

### ER Diagram

```mermaid
erDiagram
    PRODUCTS ||--o{ RISK_RULES : "has"
    EMAILS ||--|| RISK_ASSESSMENTS : "scored by"
    RISK_ASSESSMENTS ||--o{ APPROVAL_REQUESTS : "triggers"
    APPROVAL_REQUESTS ||--o{ APPROVAL_DECISIONS : "decided in"
    USERS ||--o{ APPROVAL_DECISIONS : "decides"
    RISK_RULES {
        uuid id PK
        string name
        uuid product_id FK
        json conditions
        string action
        int priority
        bool active
    }
    RISK_ASSESSMENTS {
        uuid id PK
        uuid email_id FK
        int risk_score
        string risk_tier
        json rules_triggered
        bool requires_approval
        timestamp assessed_at
    }
    APPROVAL_REQUESTS {
        uuid id PK
        uuid email_id FK
        uuid requested_by_user_id FK
        uuid assigned_approver_user_id FK
        string status
        timestamp expires_at
        timestamp decided_at
    }
    APPROVAL_DECISIONS {
        uuid id PK
        uuid approval_request_id FK
        uuid decided_by_user_id FK
        string decision
        text comments
    }
```

### Tables

#### `risk_rules`
- **What:** Configurable rules that classify email risk.
- **Why:** Each product has different risk profiles (healthcare email = HIGH, internal notification = LOW).
- **How:** `conditions` JSON example:
```json
{
  "any_of": [
    { "field": "recipient_count", "op": ">", "value": 1000 },
    { "field": "product_id", "op": "in", "value": ["financemutual", "recuvery"] },
    { "field": "content_contains", "op": "any", "value": ["payment due", "overdue"] }
  ]
}
```
`action` ∈ {`auto_send`, `peer_review`, `manager_approval`}. Highest-priority matching rule wins.

#### `risk_assessments`
- **What:** Risk score for a specific email.
- **Why:** Drives routing decision. Audit trail.
- **How:** Computed at send-time. `risk_score` 0-100. `risk_tier` ∈ {`low`, `medium`, `high`}.

#### `approval_requests`
- **What:** Email queued for human approval.
- **Why:** Semi-autonomous workflow — high-risk emails wait for human.
- **How:** Assigned to manager of the requester's team. `expires_at` = +24h. Slack notification sent.

#### `approval_decisions`
- **What:** The decision made on an approval request.
- **Why:** Compliance audit trail; who approved what.
- **How:** `decision` ∈ {`approved`, `rejected`, `requested_changes`}.

---

## Domain 8 — Sending

**Purpose:** The actual email delivery — what was sent, by whom, via which account.
**Key question:** *"What email was sent to Mr. Sharma yesterday, from whose Gmail, with what content?"*

### ER Diagram

```mermaid
erDiagram
    USERS ||--o{ SENDING_ACCOUNTS : "owns"
    USERS ||--o{ EMAILS : "sends"
    PRODUCTS ||--o{ EMAILS : "scoped to"
    CONVERSATIONS ||--o{ EMAILS : "produces"
    CAMPAIGNS ||--o{ EMAILS : "produces"
    EMAIL_DRAFTS ||--|| EMAILS : "becomes"
    SENDING_ACCOUNTS ||--o{ EMAILS : "delivered via"
    EMAILS ||--o{ EMAIL_RECIPIENTS : "addressed to"
    EMAILS ||--o{ EMAIL_ATTACHMENTS : "carries"
    SENDING_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string provider
        string email_address
        text oauth_access_token_encrypted
        text oauth_refresh_token_encrypted
        timestamp token_expires_at
        json scopes
        bool active
    }
    EMAILS {
        uuid id PK
        uuid conversation_id FK
        uuid campaign_id FK
        uuid draft_id FK
        uuid product_id FK
        uuid sender_user_id FK
        uuid sending_account_id FK
        text subject
        text body_html
        text body_text
        timestamp scheduled_at
        timestamp sent_at
        string status
        string provider_message_id
        int risk_score
        uuid approval_request_id FK
    }
    EMAIL_RECIPIENTS {
        uuid id PK
        uuid email_id FK
        uuid contact_id FK
        string recipient_type
        string email_address
        string display_name
    }
    EMAIL_ATTACHMENTS {
        uuid id PK
        uuid email_id FK
        string filename
        string mime_type
        bigint size_bytes
        string storage_url
    }
```

### Tables

#### `sending_accounts`
- **What:** OAuth-connected Gmail / Outlook accounts per user.
- **Why:** Emails should send from the user's *actual* mailbox so replies land in their inbox.
- **How:** User connects via OAuth on first use. Tokens encrypted at rest. Refresh handled automatically before expiry.

#### `emails`
- **What:** The central record for every email — one row per email sent.
- **Why:** Foreign key for events, attachments, recipients, risk assessment. Single source of truth.
- **How:** Created when send is initiated. `status` lifecycle: `queued → sent → delivered → opened → ...`. `provider_message_id` lets us match webhook events back.

#### `email_recipients`
- **What:** To/Cc/Bcc recipients per email.
- **Why:** Some emails have multiple recipients with different types.
- **How:** `recipient_type` ∈ {`to`, `cc`, `bcc`}. Linked to `contacts_synced` when possible; falls back to free-text email.

#### `email_attachments`
- **What:** File attachments (PDFs, proposals, etc.).
- **Why:** Sales reps need to attach proposals; support needs to attach documentation.
- **How:** Files uploaded to object storage (S3/GCS), URL stored in DB. Size limit enforced (25 MB to match Gmail).

---

## Domain 9 — Tracking & Events

**Purpose:** Capture every interaction with a sent email — opens, clicks, replies, bounces.
**Key question:** *"What happened to the email we sent? Did they open it? Click which link?"*

### ER Diagram

```mermaid
erDiagram
    EMAILS ||--o{ EMAIL_EVENTS : "produces"
    EMAIL_EVENTS ||--o| EMAIL_OPENS : "details"
    EMAIL_EVENTS ||--o| EMAIL_CLICKS : "details"
    EMAILS ||--o{ EMAIL_LINKS : "embeds"
    EMAIL_EVENTS {
        uuid id PK
        uuid email_id FK
        string event_type
        json event_data
        string ip_address
        string user_agent
        timestamp occurred_at
    }
    EMAIL_OPENS {
        uuid id PK
        uuid email_event_id FK
        timestamp opened_at
        string device_type
        string browser
        string location_country
        int read_duration_seconds
    }
    EMAIL_LINKS {
        uuid id PK
        uuid email_id FK
        string original_url
        string tracking_token UK
        int position
    }
    EMAIL_CLICKS {
        uuid id PK
        uuid email_event_id FK
        uuid email_link_id FK
        timestamp clicked_at
    }
```

### Tables

#### `email_events`
- **What:** Every event for every email — sent, delivered, opened, clicked, replied, bounced, spam-marked, unsubscribed.
- **Why:** The raw stream that powers all analytics and the learning loop.
- **How:** High write volume — partition by `occurred_at` (monthly partitions in MySQL/PG). Captured via:
  - Provider webhooks (Gmail/Outlook bounce, delivery)
  - 1x1 tracking pixel (opens)
  - Tracking redirect URL (clicks)
  - IMAP polling on user mailbox (replies)

#### `email_opens`
- **What:** Extra details for open events.
- **Why:** Engagement quality matters — read for 30 seconds is different from a 1-second glance.
- **How:** Tracking pixel reports back; JavaScript timer measures read duration when possible.

#### `email_links`
- **What:** Each link embedded in an email, with a unique tracking token.
- **Why:** To know which link was clicked, we replace original URLs with tracking redirects.
- **How:** At render time, original URLs replaced with `https://track.bridgingtech.com/c/{tracking_token}`. Redirect server logs click and forwards.

#### `email_clicks`
- **What:** Click events with link reference.
- **Why:** Power CTR analytics per link, per template, per product.
- **How:** Click event fires on redirect, joins to `email_links` for the link metadata.

---

## Domain 10 — AI Ops, Compliance & Audit

**Purpose:** Track every AI call, every compliance check, every action — for cost, debugging, and audit.
**Key question:** *"How much did we spend on AI yesterday? Which prompts work? What did user X do last week?"*

### ER Diagram

```mermaid
erDiagram
    CONVERSATIONS ||--o{ AGENT_INVOCATIONS : "triggers"
    EMAILS ||--o{ AGENT_INVOCATIONS : "triggers"
    PROMPT_TEMPLATES ||--o{ AGENT_INVOCATIONS : "executed via"
    AGENT_INVOCATIONS }o--|| LLM_USAGE_AGGREGATES : "rolled up to"
    EMAILS ||--o{ COMPLIANCE_CHECKS : "validated by"
    PRODUCT_COMPLIANCE_RULES ||--o{ COMPLIANCE_CHECKS : "applied as"
    USERS ||--o{ AUDIT_LOGS : "performs"
    AGENT_INVOCATIONS {
        uuid id PK
        uuid conversation_id FK
        uuid email_id FK
        string agent_type
        text prompt_used
        text response
        string llm_provider
        string llm_model
        int input_tokens
        int output_tokens
        decimal cost_usd
        int latency_ms
        bool success
        text error
    }
    PROMPT_TEMPLATES {
        uuid id PK
        string agent_type
        int version
        text system_prompt
        text user_prompt_template
        string default_model
        bool active
        decimal performance_score
    }
    LLM_USAGE_AGGREGATES {
        uuid id PK
        date usage_date
        uuid user_id FK
        uuid product_id FK
        string agent_type
        string llm_provider
        int total_calls
        bigint total_input_tokens
        bigint total_output_tokens
        decimal total_cost_usd
    }
    COMPLIANCE_CHECKS {
        uuid id PK
        uuid email_id FK
        uuid rule_id FK
        string check_type
        bool passed
        json violations
        uuid agent_invocation_id FK
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        json before_state
        json after_state
        string ip_address
        string user_agent
    }
```

### Tables

#### `agent_invocations`
- **What:** Every LLM call logged — which agent, which model, prompt, response, cost, latency.
- **Why:** Debugging, cost tracking, prompt iteration, A/B testing.
- **How:** Logged by LLM Router (LiteLLM hook). Cost computed from token counts × per-model pricing.

#### `prompt_templates`
- **What:** Versioned prompts per agent.
- **Why:** Iterate prompts safely; A/B test; promote winners.
- **How:** Managed via Langfuse UI, synced to DB. `performance_score` from downstream metrics (reply rate, open rate).

#### `llm_usage_aggregates`
- **What:** Daily rolled-up LLM usage by (user, product, agent, provider).
- **Why:** Cost reporting without scanning the huge `agent_invocations` table.
- **How:** Daily ETL job rolls up. Powers budget alerts.

#### `compliance_checks`
- **What:** Per-email compliance check results.
- **Why:** Audit trail for HIPAA / FDCPA / PCI / GDPR. Required for legal.
- **How:** Compliance Agent runs all relevant rules; each check is one row. `violations` JSON lists what failed.

#### `audit_logs`
- **What:** Audit trail of all significant actions (login, send, approve, edit brand kit, change risk rule).
- **Why:** Security, compliance, debugging ("who changed Denefits' brand color?").
- **How:** Captured via middleware/decorator on mutating endpoints. `before_state` / `after_state` diff stored as JSON.

---

## Cross-Domain Relationships

The diagram below shows how the 10 domains connect at the top level (only the most important FKs across domains):

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : starts
    USERS ||--o{ CAMPAIGNS : creates
    USERS ||--o{ APPROVAL_DECISIONS : decides
    USERS ||--o{ AUDIT_LOGS : performs
    USERS ||--o{ SENDING_ACCOUNTS : owns
    PRODUCTS ||--|| BRAND_KITS : has
    PRODUCTS ||--o{ EMAIL_TEMPLATES : has
    PRODUCTS ||--o{ CONTACTS_SYNCED : has
    PRODUCTS ||--o{ CAMPAIGNS : scopes
    PRODUCTS ||--o{ CONVERSATIONS : scopes
    PRODUCTS ||--o{ RISK_RULES : has
    PRODUCTS ||--o{ PRODUCT_COMPLIANCE_RULES : has
    CONTACTS_SYNCED ||--o{ CONVERSATIONS : "target of"
    CONTACTS_SYNCED ||--o{ CAMPAIGN_RECIPIENTS : "receives"
    CONVERSATIONS ||--o{ EMAILS : produces
    CAMPAIGNS ||--o{ EMAILS : produces
    EMAILS ||--|| RISK_ASSESSMENTS : scored
    EMAILS ||--o{ EMAIL_EVENTS : tracked
    EMAILS ||--o{ COMPLIANCE_CHECKS : checked
    EMAILS ||--o{ AGENT_INVOCATIONS : involves
    EMAIL_TEMPLATES ||--o{ CAMPAIGNS : uses
    EMAIL_TEMPLATES ||--o{ EMAIL_DRAFTS : "based on"
```

**Reading guide:** `USERS` and `PRODUCTS` are the two most-connected entities — almost everything traces back to one of them. `EMAILS` is the operational hub — once an email is created, many other tables hang off of it.

---

## Indexing & Performance Notes

### High-volume tables (need partitioning + indexes)
- `email_events` — partition by month on `occurred_at`. Indexes: `(email_id)`, `(event_type, occurred_at)`.
- `agent_invocations` — partition by month. Indexes: `(agent_type, invoked_at)`, `(llm_provider, invoked_at)`.
- `audit_logs` — partition by month. Indexes: `(user_id, occurred_at)`, `(entity_type, entity_id)`.

### Lookup-heavy tables (need covering indexes)
- `contacts_synced` — `(product_id, email)`, `(product_id, lead_stage)`.
- `emails` — `(sender_user_id, sent_at)`, `(product_id, sent_at)`.
- `campaign_recipients` — `(campaign_id, status)`.

### Recommended row-count targets (1-year horizon)
| Table | Estimated rows |
|---|---|
| users | < 1,000 |
| contacts_synced | 1M–10M |
| emails | 5M–50M |
| email_events | 50M–500M |
| agent_invocations | 20M–200M |
| audit_logs | 10M–100M |

For 50M+ row tables, consider archival to cold storage (S3/Parquet) after 12 months.

---

## Setup Order

When building from scratch, set up tables in this order to satisfy foreign keys:

1. **Foundation** → `roles`, `products`, `users`, `teams`, `user_teams`, `user_roles`, `product_team_access`
2. **Brand** → `brand_kits`, `brand_kit_versions`, `product_compliance_rules`
3. **Integration** → `product_db_connections`, `schema_mappings`
4. **Contacts** → `contacts_synced`, `contact_history_cache`, `sync_jobs`
5. **Templates** → `email_templates`, `template_versions`
6. **Conversation** → `conversations`, `conversation_messages`, `email_drafts`
7. **Campaigns** → `segments`, `campaigns`, `campaign_recipients`
8. **Risk** → `risk_rules`, `risk_assessments`, `approval_requests`, `approval_decisions`
9. **Sending** → `sending_accounts`, `emails`, `email_recipients`, `email_attachments`, `email_links`
10. **Tracking** → `email_events`, `email_opens`, `email_clicks`
11. **AI Ops** → `prompt_templates`, `agent_invocations`, `llm_usage_aggregates`
12. **Compliance & Audit** → `compliance_checks`, `audit_logs`
13. **Aggregates** → `template_performance` (populated after first sends)

---

*Document version: 1.0 — Generated for BridgingTech Email Platform v1 MVP scope.*
*Next document recommended: SQL DDL file with full CREATE TABLE statements.*

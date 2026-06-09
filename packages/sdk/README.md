# @ai-sentinel/sdk

TypeScript client for the **AI Compliance Sentinel** email-validation API. Validate
outbound emails for harmful language, spam triggers, and correctness — and get a
corrected version back — before you send.

## Install

This package is part of the monorepo workspace. From an external project, point it
at your deployed API base URL.

## Usage

```ts
import { SentinelClient } from "@ai-sentinel/sdk";

const client = new SentinelClient({
  apiKey: "sk_live_...",            // your tenant API key
  baseUrl: "https://your-host/v1",  // defaults to http://localhost:4000/v1
});

const result = await client.validateEmail({
  subject: "FREE MONEY!!! act now",
  body: "<p>Click here to win cash guaranteed.</p>",
  // llmApiKey: "sk-...",  // optional per-request override of the stored key
  // model: "gpt-4o-mini", // optional per-request model override
});

if (!result.passed) {
  console.log("Issues:", result.issues);       // [{ type, what, why, howToFix, severity }]
  console.log("Corrected:", result.corrected);  // { subject, body }
}

// Analytics
const stats = await client.getStats();          // { total, passed, flagged, passRate, series }
const recent = await client.listValidations({ limit: 20 });
```

## Authentication

Register a tenant and receive an initial API key (shown once):

```bash
curl -X POST https://your-host/v1/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","email":"dev@acme.com"}'
```

Configure your LLM provider key (encrypted at rest) and Google Chat webhook in the
web Settings page. The stored LLM key is used unless you pass `llmApiKey` per request.

## Notifications

When an email is flagged and a Google Chat webhook is configured for the tenant, a
card with the issues (what / why / how-to-fix) and the corrected email is posted to
the space automatically.

## Roadmap

- **Python SDK** (`packages/sdk-python/`) — a thin `httpx` wrapper mirroring
  `validateEmail`, `listValidations`, and `getStats`. Not yet implemented.

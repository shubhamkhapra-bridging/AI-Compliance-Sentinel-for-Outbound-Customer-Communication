# Run Agent

Invoke a single agent directly with a custom JSON input for debugging, testing, or manual orchestration.

## Usage

```
/run-agent <agent_name> [json_input]
```

## Available Agents

| Name | Class | Module |
|---|---|---|
| `intent` | `IntentAgent` | `agents.intent_agent` |
| `recipient` | `RecipientAgent` | `agents.recipient_agent` |
| `generation` | `GenerationAgent` | `agents.generation_agent` |
| `template` | `TemplateAgent` | `agents.template_agent` |
| `compliance` | `ComplianceAgent` | `agents.compliance_agent` |
| `deliverability` | `DeliverabilityAgent` | `agents.deliverability_agent` |
| `optimization` | `OptimizationAgent` | `agents.optimization_agent` |
| `sending` | `SendingAgent` | `agents.sending_agent` |
| `tracking` | `TrackingAgent` | `agents.tracking_agent` |
| `learning` | `LearningAgent` | `agents.learning_agent` |

## Examples

```
/run-agent intent {"user_message": "Send a follow-up to the client"}
/run-agent compliance {"subject": "Special Offer!!!", "body": "Click here now!!!"}
/run-agent deliverability {"subject": "Hello", "body": "...", "html": "..."}
/run-agent template {"intent": "sales_outreach", "tone": "professional"}
```

## Steps

1. Parse `agent_name` from the first argument.
2. Parse `json_input` from the remaining argument (default to `{}` if omitted).
3. Import the agent class dynamically:
   ```python
   from agents.<agent_name>_agent import <AgentClass>
   agent = <AgentClass>()
   result = await agent.run(input)
   ```
4. Display the raw agent output as formatted JSON.
5. Show execution time and any warnings from the agent logs.

## Output Format

```json
{
  "agent": "<name>",
  "status": "success | error",
  "execution_ms": 342,
  "output": { ... },
  "warnings": []
}
```

## Notes

- Use this for rapid debugging without going through the full pipeline.
- Input schema validation is enforced — the agent will reject malformed inputs with a helpful error.
- For the `sending` agent, a dry-run mode is used by default (set `"dry_run": false` to actually send).

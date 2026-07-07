---
name: mcp-hubspot
description: Read/write HubSpot CRM data — contacts, companies, deals, lists, audiences, sequences. STUB in Workstream C — invocation guidance only; Workstream D provides actual MCP connection.
---

# Skill: mcp-hubspot (Workstream C stub)

## Status

**STUB.** Workstream D wires the actual HubSpot MCP server. Until then, this skill
documents the EXPECTED interface so agents can write code that targets it.

## What agents will call

| Operation | Used by | Input | Output |
|---|---|---|---|
| `read_contacts(list_id, filters)` | phase4.outbound_partner (tier-1 list build), phase4.paid_media (audience layering) | list filters | contacts[] with persona signals |
| `read_companies(filters)` | phase4.outbound_partner | filters | companies[] |
| `read_closed_won(timeframe)` | phase3.sales_enablement (q_top_lost_deal / q_top_won), phase5.measurement | timeframe | deal records |
| `read_closed_lost(timeframe)` | phase3.sales_enablement (objection_responses), phase5.measurement | timeframe | deal records with loss reasons |
| `write_audience(name, member_ids)` | phase4.paid_media | audience definition | confirmation |
| `enrich_contact(contact_id, persona_data)` | phase4.outbound_partner | persona enrichment | confirmation |
| `dispatch_sequence(sequence_id, contact_ids)` | phase4.outbound_partner | sequence + targets | run_id |

## Workstream C behavior

When an agent's `gather_context` stage references HubSpot data:

1. Check if `MCP_HUBSPOT_ENABLED` env var is true and the MCP server is connected.
2. If NOT (Workstream C default), the agent emits `[INTEGRATION DEGRADED: hubspot]`
   markers in its plan output and continues with whatever the user provided via
   the MVC gate.
3. If yes (Workstream D), this skill delegates to the actual MCP server's tools.

## Required tenant config

```yaml
# tenants/<id>/tenant_profile.yaml
tech_stack:
  crm: hubspot
integrations:
  hubspot:
    portal_id: "..."
    api_key_env_var: HUBSPOT_API_KEY
    sandbox: false
```

## Do NOT (always — Workstream C and D)

- Don't write to production HubSpot without explicit user opt-in per call.
- Don't read PII fields (email, phone) into context_bus payloads — keep them
  ref-only (use HubSpot IDs; resolve at dispatch time only).
- Don't dispatch sequences without an approved EmailSequencePack reference.

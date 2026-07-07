---
name: mcp-salesforce
description: Read/write Salesforce — accounts, opportunities, contacts, tasks, lists, audiences. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-salesforce (Workstream C stub)

## Status

**STUB.** Workstream D wires the actual Salesforce MCP server.

## What agents will call

| Operation | Used by |
|---|---|
| `read_accounts(filters)` | phase4.outbound_partner (tier-1 list build) |
| `read_opportunities(stage, timeframe)` | phase3.sales_enablement (win/loss analysis), phase5.measurement |
| `read_contacts(account_id)` | phase4.outbound_partner (multi-thread persona discovery) |
| `enrich_account(account_id, persona_data)` | phase4.outbound_partner |
| `create_tasks(account_ids, sequence_ref)` | phase4.outbound_partner (SDR task creation) |
| `read_win_loss_reasons(timeframe)` | phase3.sales_enablement |

## Required tenant config

```yaml
tech_stack:
  crm: salesforce
integrations:
  salesforce:
    instance_url: "https://acme.my.salesforce.com"
    api_version: "v60.0"
    auth_env_var: SFDC_REFRESH_TOKEN
    sandbox: false
```

## Do NOT

- Don't write to production SFDC without explicit user opt-in per call.
- Don't ingest PII into context_bus — keep refs to SFDC IDs.
- Don't bulk-update fields across >100 records without a rollback plan.

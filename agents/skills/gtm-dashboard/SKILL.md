---
name: gtm-dashboard
description: Use this skill to render a one-shot text dashboard for a tenant — active cycles, agent runs, pending approvals, recent audit events, signal feed. Triggered by "show the dashboard", "what's going on", "/gtm-dashboard".
---

# Skill: gtm-dashboard

## Required inputs

| Field | Source |
|---|---|
| `tenant_id` | User |

## Steps

1. **Tenant header:** read `tenants/<id>/tenant_profile.yaml` → brand_name, primary motion, primary ICP, frameworks.
2. **Active cycles:** list every `tenants/<id>/cycles/*/cycle_state.yaml` with `status: running`. For each, show the cycle_id and started_at.
3. **Recent runs:** scan `tenants/<id>/cycles/*/runs/*.json`, sort by `completed_at` desc, take top 10. Show: agent_slug, status, cost_usd, latency.
4. **Pending approvals:** invoke `gtm-pending` skill internally, take the count.
5. **Recent audit events:** tail `governance/audit_log.jsonl` for the last 20 events for this tenant.
6. **Signals:** if `tenants/<id>/signals/` exists (Workstream D), show the 5 most recent.

## Output format

```
╔══════════════════════════════════════════════════════════════╗
║ Tenant: <brand_name> (<tenant_id>)                          ║
║ Industry: <primary>  •  Motion: <primary>  •  ICP: <id>     ║
║ Frameworks: <list>                                          ║
╚══════════════════════════════════════════════════════════════╝

▸ Active cycles (<n>)
   • <cycle_id> — started <ago>

▸ Recent runs (last 10)
   • <agent_slug>   <status>   $<cost>   <latency>ms

▸ Pending approvals: <n>     (use /gtm-pending for details)

▸ Recent audit events
   <iso>  <event>  <actor>  <subject_id>
   …
```

## Do NOT

- Don't render PII (names, emails) beyond what the tenant_profile shows.
- Don't fetch external data — this is a local-state-only view.

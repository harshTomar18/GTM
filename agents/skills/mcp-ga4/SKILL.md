---
name: mcp-ga4
description: Read Google Analytics 4 — page views, conversions, attribution paths, audiences. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-ga4 (Workstream C stub)

## Status

**STUB.** Workstream D wires the actual GA4 Data API MCP server.

## What agents will call

| Operation | Used by |
|---|---|
| `read_page_metrics(date_range, metrics)` | phase5.measurement, phase4.seo_activation (refresh decisions) |
| `read_conversions(action_name, date_range)` | phase5.measurement, phase5.experiment_review |
| `read_traffic_sources(date_range)` | phase5.measurement, phase4.channel_strategy (next cycle's prior_cycle_attribution) |
| `read_attribution_paths(model, date_range)` | phase5.measurement (multi-touch attribution input) |
| `read_audience(audience_id)` | phase4.paid_media (audience layering) |

## Required tenant config

```yaml
tech_stack:
  analytics: ga4
integrations:
  ga4:
    property_id: "123456789"
    measurement_id: "G-XXXXXXXXXX"
    service_account_json_env_var: GA4_SERVICE_ACCOUNT_JSON
```

## Do NOT

- Don't request more than 10k rows per call (GA4 sampling kicks in; use date partitions).
- Don't write to context_bus with raw GA4 user_pseudo_ids — privacy-sensitive.

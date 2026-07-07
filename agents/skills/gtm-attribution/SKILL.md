---
name: gtm-attribution
description: Marketing attribution service — logs touchpoint events, computes attribution weights per the tenant's declared model (first-touch, last-touch, linear, position-based, data-driven), and provides attribution summaries consumed by phase5.measurement and phase5.executive_brief. Invoked by phase4 distribution agents when activities launch and by phase5.measurement when building the KPI framework.
---

## What it does

Three operations:

1. **log_event** — records a marketing touchpoint event when a distribution activity fires (email sent, ad clicked, page visited, outbound reply, community post viewed).
2. **compute_attribution** — when phase5.measurement runs, applies the tenant's declared attribution model to produce channel and campaign attribution weights for pipeline opportunities.
3. **get_attribution_summary** — returns a structured summary of channel-attributed pipeline for a cycle.

## Attribution event structure

```json
{
  "schema_version": "AttributionEvent:v1.0.0",
  "event_id": "<uuid>",
  "tenant_id": "<id>",
  "cycle_id": "<id>",
  "account_id": "<pseudonymized CRM id>",
  "contact_id": "<pseudonymized>",
  "touchpoint_type": "email_open | email_click | ad_click | page_visit | form_fill | demo_request | content_download | outbound_reply | community_referral",
  "channel": "paid_search | paid_social | organic | email_nurture | outbound | partner | community | event",
  "source_agent": "<phase4.paid_media | phase4.outbound_partner | etc>",
  "campaign_ref": "<CampaignCalendar item_id>",
  "artifact_ref": "<ContextBus key>",
  "timestamp": "<ISO-8601>",
  "opportunity_id": "<CRM opp id if known, else null>"
}
```

## Attribution models

| Model | Logic |
|---|---|
| first_touch | 100% credit to the first touchpoint before opportunity creation |
| last_touch | 100% credit to the last touchpoint before opportunity creation |
| linear | Equal weight across all touchpoints in the path |
| position_based_40_20_40 | 40% first, 40% last, 20% split across middle |
| data_driven | Shapley-value approximation across touchpoints (Workstream D full impl) |

## Operations

### `log_event(event)`

1. Validate against AttributionEvent schema.
2. Write to `tenants/<id>/cycles/<cycle>/attribution_events/<date>/<event_id>.json`.
3. Audit log: `attribution.event_logged`.
4. PII check: account_id and contact_id must be pseudonymized (no raw emails/names). Reject if raw PII detected.

### `compute_attribution(tenant_id, cycle_id, model)`

1. Load all attribution_events for the cycle.
2. Load CRM opportunity data (via mcp-hubspot or mcp-salesforce) to map events to opps.
3. For each opp, reconstruct the touchpoint path (events sorted by timestamp where opportunity_id matches or account_id matches within lookback window).
4. Apply the model to assign credit weights.
5. Aggregate by channel — total attributed pipeline USD.
6. Return `AttributionSummary`:
   ```json
   {
     "model_used": "<model>",
     "lookback_window_days": 90,
     "channels": [
       {
         "channel": "<channel>",
         "attributed_pipeline_usd": 0,
         "opp_count": 0,
         "top_campaigns": []
       }
     ],
     "total_attributed_pipeline_usd": 0,
     "coverage_rate": "<opps with ≥1 touchpoint / total opps>"
   }
   ```

### `get_attribution_summary(tenant_id, cycle_id)`

Returns the most recent computed AttributionSummary for the cycle (or triggers compute if not yet run).

## Do NOT

- Don't store raw PII in attribution events — pseudonymize at ingestion.
- Don't run data-driven (Shapley) model with fewer than 100 opp events — fall back to linear with a warning.
- Don't attribute an event to an opp outside the declared `lookback_window_days` (default 90).
- Don't cross-tenant: attribution events are strictly per-tenant.

## Workstream status

- **A/B/C:** AttributionEvent schema exists; log_event stub only.
- **D:** compute_attribution and get_attribution_summary active; data-driven model in beta (requires 100+ opps).

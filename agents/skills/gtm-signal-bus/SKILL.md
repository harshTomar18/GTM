---
name: gtm-signal-bus
description: The GTM signal bus — ingest, normalize, store, and dispatch external signals (intent spikes, competitor moves, KPI misses, content spikes) to subscriber agents. Invoked by phase5.competitive_pulse to emit signals; also polled by the reactive dispatcher in gtm-cycle-start to check for pending reactive inserts.
---

## What it does

The signal bus is the event backbone connecting external data sources to reactive agent runs. It does four things:

1. **Ingest** — accepts raw signal payloads from phase5.competitive_pulse, MCP webhooks (6sense intent, Bombora surge, news APIs), and operator manual inserts.
2. **Normalize** — maps any raw signal into the canonical `CompetitiveSignal` structure.
3. **Store** — writes normalized signals to `tenants/<id>/signals/<YYYY-MM-DD>/<signal_id>.json`.
4. **Dispatch** — matches signals to subscriptions and creates `pending_reactive_inserts` records for the active cycle.

## Signal structure

```json
{
  "signal_id": "<uuid>",
  "tenant_id": "<id>",
  "cycle_id": "<active cycle or null>",
  "signal_type": "intent_spike | competitor_move | kpi_miss | content_spike | funding | hiring | pricing_change | review_surge | crisis",
  "source": "<competitive_pulse | bombora | 6sense | manual | news_api>",
  "subject": "<account_id or competitor_name or topic>",
  "intensity": "low | medium | high | critical",
  "actionability": "informational | actionable | urgent",
  "description": "<human-readable summary>",
  "source_url": "<optional>",
  "emitted_at": "<ISO-8601>",
  "ttl_days": 30,
  "acted_upon": false
}
```

## Subscription table

Built-in dispatch rules mapping signal_type to the agent and action triggered:

| signal_type | intensity threshold | Dispatches to |
|---|---|---|
| competitor_move | medium+ | phase1.market_research (refresh mode) |
| competitor_move | high/critical | phase3.sales_enablement (battlecard_update) |
| intent_spike | high/critical | phase4.outbound_partner (proposed_insert) |
| kpi_miss | any | phase5.iteration_planner (tactical_brief) |
| content_spike | medium+ | phase3.content_assets (topical_response) |
| crisis | any | ESCALATE_TO_CMO (no auto-dispatch) |
| funding | high | phase1.market_research (refresh mode) |
| pricing_change | medium+ | phase3.sales_enablement (battlecard_update) |

## Operations

### `emit_signal(signal)`

1. Validate signal structure against the signal schema above.
2. Write to `tenants/<id>/signals/<date>/<signal_id>.json`.
3. Match against subscription table.
4. For each match, write `tenants/<id>/cycles/<cycle>/reactive_inserts/<signal_id>_<agent_slug>.json`:
   ```json
   { "insert_id": "<uuid>", "signal_id": "<signal_id>", "target_agent": "<slug>", "status": "pending", "proposed_at": "<ts>" }
   ```
5. Audit log: `signal.received` + `signal.acted_upon` (one per dispatch).
6. If signal_type=crisis — skip auto-dispatch, write to crisis queue, Slack DM to CMO role.

### `list_pending_inserts(tenant_id, cycle_id)`

Returns all `reactive_inserts/*.json` where `status: pending`. Used by gtm-cycle-start reactive dispatcher poll.

### `mark_acted(insert_id, decision: approved|rejected, actor)`

Updates `reactive_inserts/<id>.json`: sets status to acted, records decision, actor, acted_at. Audit log: `signal.acted_upon`.

### `get_signal_feed(tenant_id, since_hours=24)`

Returns all signals emitted in the last N hours, sorted by intensity desc. Used by gtm-dashboard.

## Storage layout

```
tenants/<id>/
  signals/
    2026-05-22/
      <signal_id>.json
  cycles/<cycle>/
    reactive_inserts/
      <signal_id>_phase4.outbound_partner.json
      <signal_id>_phase1.market_research.json
```

## Do NOT

- Don't auto-dispatch crisis signals — always escalate to CMO.
- Don't retain signals beyond `ttl_days` — stale signals skew the reactive dispatch queue.
- Don't emit signals without a source — phantom signals corrupt the competitive intelligence layer.
- Don't act on a pending_insert without operator approval via gtm-approve.
- Don't cross-tenant: signal bus is strictly per-tenant-id.

## Workstream status

- **A/B/C:** signal bus is referenced by phase5.competitive_pulse but operations are stubs.
- **D:** fully active. phase5.competitive_pulse calls `emit_signal` directly; gtm-cycle-start polls `list_pending_inserts` on every batch boundary.

# phase5.competitive_pulse

**Phase:** 5 — Measurement & Optimization
**Stage:** 4 of 4 in Phase 5
**Always On:** Yes — this agent runs on a scheduled cadence independent of cycle execution
**Optional in Cycle:** Yes — declared `optional: true` in the Phase 5 block of `cycle.yaml`

---

## Purpose

`phase5.competitive_pulse` is the Universal-GTM-OS's continuous competitive intelligence
layer. Unlike other agents that run once per GTM cycle, this agent is `always_on: true` —
it executes on a configurable scheduled cadence (default: every 24 hours) and emits
structured signals to the signal bus that can trigger reactive downstream agent runs.

The agent monitors a watchlist of competitors derived from `phase1.market_research` output
(CompetitorMatrix) and supplemental entries in `profile.known_competitors`. For each run it
produces two outputs:

1. **CompetitivePulseReport** — a markdown-formatted digest with structured JSON, intended
   for the GTM team's Slack channel and weekly review cadence.
2. **CompetitiveSignal[]** — typed signals emitted to the signal bus, consumed by the
   reactive dispatcher to optionally trigger downstream agents.

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `agent_spec.yaml` | Full agent specification: inputs, outputs, models, SLA, failure modes, KPIs |
| `questions.yaml` | Operator setup questions (sources, alert threshold, Slack channel, cadence) |
| `rubric.yaml` | Self-review rubric with 4 weighted criteria; pass threshold 0.80 |
| `prompt.md` | Jinja2-templated prompt — zero brand literals; all values resolved at runtime |
| `README.md` | This file |

---

## Always-On Behavior

`competitive_pulse` is the only Phase 5 agent with `always_on: true`. This means:

- It is **not** blocked behind the GTM cycle end gate.
- It runs on the schedule defined by `profile.competitive_pulse.cadence_hours` (default: 24h).
- It can be triggered reactively by the dispatcher (e.g. after a significant market event).
- Quiet-hour suppression applies to **Slack delivery only** — signals are always written to
  the signal bus regardless of time of day.

Operators who do not want scheduled execution can set `cadence_hours: 0` to disable the
schedule and rely on manual or reactive invocations only.

---

## Signal Bus Integration

The reactive dispatcher subscribes to this agent's signal bus output. The subscription
filters to signals where `actionability` is `actionable` or `urgent`.

When such a signal is emitted, the dispatcher may trigger:

| Signal event_type | Likely downstream agent |
|-------------------|------------------------|
| `feature` | `phase3.sales_enablement` (battlecard update) |
| `pricing` | `phase3.sales_enablement`, `phase2.positioning` |
| `funding` | `phase1.market_research` (refresh), `phase2.narrative_lock` |
| `content` | `phase3.seo_content`, `phase4.distribution` |
| `hiring` | `phase1.market_research` (refresh) |
| `review` | `phase3.sales_enablement` (social proof update) |
| `complaint` | Informational only — no automatic trigger |

The reactive dispatch is advisory — operators can configure which signal types actually
trigger downstream runs in `cycle.yaml`'s `reactive_hooks` block.

---

## Inputs

| Input | Source | Schema | Required |
|-------|--------|--------|---------|
| Competitor watchlist | `phase1.market_research.output` | `CompetitorMatrix:v1` | Yes |
| Research context | `phase1.research_synthesis.output` | `ResearchDossier:v1` | No |

If the competitor matrix is empty and `profile.known_competitors` is also empty,
the agent emits a `[WATCHLIST EMPTY]` urgent signal and recommends a
`phase1.market_research` refresh. It does not halt silently.

---

## Output

**Schema:** `CompetitivePulseReport:v1.0.0`

**Structure:**

```
CompetitivePulseReport
  schema_version: "CompetitivePulseReport:v1.0.0"
  run_at: <ISO-8601>
  cycle_id: <string>
  competitors_checked: <int>
  signals:
    - CompetitiveSignal (signal_id, competitor_name, event_type, description,
                          source_url, source_description, source_degraded,
                          intensity, actionability, recommended_response_agent,
                          emitted_at)
  summary_for_gtm_team: <2-3 sentence narrative>
  recommended_actions: [<string>, ...]
  quality_score: <float>
  quality_warning: <string|null>
```

---

## Model Routing

| Task | Model | Rationale |
|------|-------|-----------|
| Planning | `claude-sonnet-4-6` | Watchlist planning and source routing |
| Gathering | `claude-haiku-4-5-20251001` | High-frequency source queries; cost-sensitive |
| Synthesizing | `claude-sonnet-4-6` | Signal extraction and intensity scoring |
| Writing | `claude-sonnet-4-6` | Report narrative and recommended_actions |
| Reviewing | `claude-haiku-4-5-20251001` | Rubric self-check; cost-sensitive |

Opus models are explicitly excluded. This agent is high-frequency and
cost-sensitive (SLA: max_cost_usd = $1.50 per run).

---

## Prompt Caching

| Block | Cached | Content |
|-------|--------|---------|
| Block 1 | Yes | System role, output schemas, intensity rules (static) |
| Block 2 | No | Live watchlist, run context, known signals (changes every run) |
| Block 3 | No | Task instructions, self-review rubric invocation (changes with context) |

---

## Failure Modes

| Condition | Response |
|-----------|----------|
| Watchlist empty | Emit `[WATCHLIST EMPTY]` urgent signal; recommend phase1.market_research refresh |
| All signals > 7 days old | Emit staleness alert signal (medium/actionable) |
| Source MCP unavailable | Mark affected signals `source_degraded: true`; continue with available sources |

No failure mode halts the agent silently — every failure produces at least one signal.

---

## KPIs

| KPI | Target |
|-----|--------|
| `signal_volume` | > 0 informational and > 0 actionable per run |
| `false_positive_rate` | < 0.20 (< 20% of signals marked irrelevant by operator) |
| `time_to_alert_minutes` | < 60 minutes from event publication to signal emission |
| `report_freshness` | 1.0 (100% of runs produce report within cadence_hours) |

---

## Rubric Summary

Pass threshold: **0.80** (higher than standard 0.70 — signals feed reactive dispatch)

| Criterion | Weight |
|-----------|--------|
| watchlist_coverage | 0.30 |
| signal_specificity | 0.30 |
| actionability_tagging | 0.25 |
| no_hallucinated_events | 0.15 |

A run scoring below 0.80 attaches a `QUALITY_WARNING` to the report but still
emits it — downstream consumers receive data with a review flag set.

---

## Setup Checklist

Before enabling competitive_pulse for the first time:

1. Ensure `phase1.market_research` has run at least once (CompetitorMatrix required)
2. Answer `q_watchlist_sources` — select which sources to monitor
3. Set `q_alert_threshold` — default is `actionable_only` (recommended)
4. Configure `q_slack_channel` if Slack delivery is desired
5. Optionally set `q_quiet_hours` and `q_cadence_hours`
6. Verify Slack integration is configured in `tenant.integrations.slack`

Once configured, the scheduler will invoke the agent automatically at the defined cadence.
Manual invocation is also supported via the `competitive_pulse` slash command.

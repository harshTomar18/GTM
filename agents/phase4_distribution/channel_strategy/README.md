# Agent: phase4.channel_strategy

**Phase:** 4 **Stage:** 1 of 6
**Inputs:** narrative_lock (approved), audience_intelligence, research_synthesis
**Output:** ChannelPlan (3-5 channels × audience × budget % × primary KPI × test hypothesis)

## Mission

Decide channel mix + budget allocation for the cycle. Motion-aligned, persona-served,
time-horizon-realistic, mandate-respecting.

## Distinctive features

- **3-5 channels.** Below = under-diversified; above = un-managed.
- **Budget sums to 1.0 ± 2%.** Hard rule.
- **Every persona served.** Orphan personas = redo.
- **Motion-aligned.** PLG with 60% outbound = redo_strict.
- **Test hypothesis specific.** Named metric + threshold required.

## Distinctive questions

- Total budget envelope (triggers CFO approval if > $25k).
- Prior-cycle attribution data.
- Strategic mandates ("must crack LinkedIn").
- Off-limits channels.
- Time-to-results tolerance.

## Outputs

| Field | Consumed by |
|---|---|
| `allocations[]` | phase4.campaign_calendar (scheduling per channel), phase4.paid_media (per-platform budget), phase4.outbound_partner (SDR allocation), phase4.community_activation (community program scale), phase5.measurement (CAC/ROAS targets) |

## Approval gate

`brand_impacting` (CMO) + `budget_threshold` (CFO if > $25k).

## KPIs

| KPI | Target |
|---|---|
| Channels | 3-5 |
| Budget sums to 1.0 | ±0.02 |
| Personas served | 100% |
| Test hypothesis present | ≥ 80% |

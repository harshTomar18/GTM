# Agent: phase4.campaign_calendar

**Phase:** 4 **Stage:** 2 of 6
**Inputs:** channel_strategy (approved), ALL Phase 3 outputs (optional but encouraged)
**Output:** CampaignCalendar (time-phased items + risk_callouts)

## Mission

Sequence every Phase 3 asset into a realistic time-phased plan. Honors
dependencies, tentpoles, blackouts, frequency caps, owner capacity, and channel
budget pacing.

## Distinctive features

- **Cycle window + blackouts hard-enforced.** No items outside window or on blackouts.
- **Dependency ordering checked.** A depends on B → A scheduled after B.
- **Owner load balancing.** No more than 3 launches per owner per day.
- **Email frequency caps enforced** across audiences and rolling windows.
- **Risk callouts mandatory.** ≥3 specific risks identified.

## Distinctive questions

- Tentpole dates.
- Cycle start / end dates.
- Owners roster (real names + roles).
- Theme weeks.
- Cycle-specific PTO blackouts.

## Outputs

| Field | Consumed by |
|---|---|
| `items[]` | phase4.seo_activation, phase4.paid_media, phase4.outbound_partner, phase4.community_activation (each filters items by their channel) |
| `risk_callouts[]` | phase5.measurement (forewarn-tracked risks) |

## Approval gate

`brand_impacting` (CMO).

## KPIs

| KPI | Target |
|---|---|
| Items scheduled | depends on cycle scale (~30+) |
| Blackout respected | 100% |
| Dependency violations | 0 |
| Owner assigned | 100% |

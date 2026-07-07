# Agent: phase3.sales_enablement

**Phase:** 3 **Stage:** 6 of 6 (last Phase 3 agent)
**Inputs:** narrative_lock (approved), messaging_matrix, market_research, audience_intelligence, value_proposition
**Output:** SalesEnablementPack (battlecards + discovery + objections + demo + cheat sheets + ROI)

## Mission

Produce sales-enablement collateral reps will use LIVE on calls. Specific,
memorable, grounded in real lost-deal reasons and real competitor weaknesses.

## Distinctive features

- **Battlecard per competitor** is mandatory — every CompetitorProfile gets one.
- **Trap-setting questions** surface competitor weaknesses without naming them
  (sales hygiene).
- **Talk tracks are verbatim-deliverable.** No "translate this into your own
  words" — the rep should be able to say it as written.
- **Discovery questions open-ended.** Yes/no questions are confirmations, not
  discovery — auto-rejected.

## Distinctive questions

- Top 3 lost-deal reasons (drives objection-handling).
- Competitors we hit most in real deals.
- Stage-by-stage gaps in the current sales process.
- Reps' "I wish I had..." wishlist.
- Demo environment status.

## Outputs

| Field | Consumed by |
|---|---|
| `battlecards[]` | phase4.outbound_partner (tier_1 accounts assigned competitor-aware sequences) |
| `persona_cheat_sheets[]` | CRM enrichment (Workstream D), sales onboarding |
| `discovery_questions[]` + `objection_responses[]` | Sales training, CRM playbooks |
| `demo_script` + `mutual_close_plan_template` | Sales process docs |

## Approval gate

`brand_impacting` (CMO) + implied Sales Leader review.

## KPIs

| KPI | Target |
|---|---|
| Battlecards / CompetitorProfiles | 100% |
| Discovery questions | ≥ 8 (target 12) |
| Objection responses | ≥ 6 (target 8) |
| Persona cheat sheets | one per persona |

# Agent: phase3.email_sequences

**Phase:** 3 **Stage:** 3 of 6
**Inputs:** narrative_lock (approved), messaging_matrix, audience_intelligence, content_assets (optional)
**Output:** EmailSequencePack (4+ sequences with steps, branch logic, suppression)

## Mission

Build nurture / prospecting / lifecycle / re-engagement sequences end-to-end —
subject lines, body, CTAs, branch logic, suppression rules, deliverability notes,
and regulatory footers.

## Distinctive features

- **Subject-line diversity enforced.** ≤40% pattern overlap across sequences.
  No "Quick question" / "Following up" stacking.
- **Branch logic mandatory** for ≥4-step sequences.
- **Personalization-token safety.** Tokens used must exist in CRM/ESP (per
  `q_personalization_tokens`) — no inventing.
- **Regulatory footer auto-applied** for tenants with regulatory_constraints.

## Distinctive questions

- Sequences in scope (nurture / prospecting / lifecycle / reengagement / etc.).
- Steps per sequence.
- Available personalization tokens.
- Suppression rules.
- Frequency cap + send window.

## Outputs

| Field | Consumed by |
|---|---|
| `sequences[]` | phase4.outbound_partner (prospecting sequences assigned to tier-1 accounts), phase4.campaign_calendar (sequence send dates) |

## Approval gate

`brand_impacting` + `legal_regulated` (if regulatory tenant).

## KPIs

| KPI | Target |
|---|---|
| Sequences produced | ≥4 |
| Avg steps per sequence | ~5 |
| Subject diversity | ≥80% |
| Regulatory footers (when required) | 100% |

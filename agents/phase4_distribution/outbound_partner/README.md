# Agent: phase4.outbound_partner

**Phase:** 4 **Stage:** 5 of 6
**Inputs:** campaign_calendar (approved), email_sequences, sales_enablement, audience_intelligence
**Output:** OutboundPartnerPack (tier-1 accounts + sequences + multi-thread + SLA + partner kits + co-marketing)

## Mission

Operationalize named-account outbound + partner co-sell — tier-1 list with
assigned sequences, multi-thread persona plan, SDR↔AE handoff SLA, partner kits,
co-marketing calendar.

## Distinctive features

- **Multi-thread mandatory** (≥3 personas per tier-1).
- **Every account has an assigned sequence.**
- **SLA must be realistic** (response_time_hours ≤ 48, specific acceptance + kickback).
- **Partner sections honest** — empty arrays if no partners declared.
- **Account research specific** — named signals, not generic fit.

## Outputs

| Field | Consumed by |
|---|---|
| `tier_1_accounts[]` | CRM enrichment (Workstream D MCPs to HubSpot/Salesforce) |
| `sdr_ae_handoff_sla` | Sales operations |
| `partner_kits[]` + `co_marketing_calendar[]` | Partner managers |

## Approval gate

`brand_impacting` (CMO + Sales Leader review).

## KPIs

| KPI | Target |
|---|---|
| Tier-1 accounts | ~30 per SDR × q_sdr_capacity |
| Multi-thread depth | ≥ 3 personas |
| Sequence assignment | 100% |
| SLA defined | yes |

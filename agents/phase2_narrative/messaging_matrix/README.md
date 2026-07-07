# Agent: phase2.messaging_matrix

**Phase:** 2 **Stage:** 3 of 5
**Inputs:** positioning (approved), value_proposition (approved), audience_intelligence
**Output:** MessagingMatrix (cells + taglines + differentiators)

## Mission

Build the **canonical messaging grid** — persona × channel × funnel-stage cells +
5-8 taglines + 5 sales-ready differentiators. This is the file every downstream
asset agent reads.

## Distinctive features

- **Cells are not exhaustive — they're intentional.** Fill only the cells that
  have a real role in the cycle. A PLG tenant probably skips sales_calls; a B2B
  enterprise probably skips TikTok.
- **Channel-shape discipline.** LinkedIn organic, LinkedIn ad, and sales-call
  talk-tracks have meaningfully different shapes for the same message.
- **Taglines compete with each other.** 5-8 variants spanning lengths AND angles
  is more useful than one perfect-but-safe option.

## Distinctive questions

- Channels in scope this cycle.
- Funnel stage definition (default 4-stage TOFU/MOFU/BOFU/RETENTION, override possible).
- Tagline constraints (word count, AI-search parseability, etc.).

## Outputs

| Field | Consumed by |
|---|---|
| `cells[]` | EVERY Phase 3 + 4 asset agent looks up its (persona, channel, funnel_stage) cell here |
| `taglines[]` | phase3.website_copy (hero), phase3.paid_ad_creative |
| `differentiators[]` | phase3.sales_enablement (battlecards), phase3.email_sequences (outbound) |

## Approval gate

`brand_impacting` → CMO.

## KPIs

| KPI | Target |
|---|---|
| Cell coverage | ≥ 80% of in-scope cells |
| Brand voice fidelity | ≥ 0.85 |
| Taglines | ≥ 5 |
| Differentiators | 5 |

# Agent: phase3.paid_ad_creative

**Phase:** 3 **Stage:** 5 of 6
**Inputs:** narrative_lock (approved), positioning, value_proposition, keyword_intent, website_copy (optional), audience_intelligence
**Output:** PaidAdCreativePack (campaigns → ad_groups → variants per platform)

## Mission

Produce platform-native ad copy + creative direction with variants for testing
and 1:1 landing-page alignment. Character limits hard-enforced.

## Distinctive features

- **Platform char limits HARD.** Google headline >30, LinkedIn headline >70, Meta
  primary text >125 = auto-redo.
- **LP match enforced.** Ad headline must align with landing page hero.
- **Variants are meaningfully distinct.** Same headline reworded thrice = fail.
- **Compliance disclaimers auto-applied** for regulated tenants.

## Outputs

| Field | Consumed by |
|---|---|
| `campaigns[]` | phase4.paid_media (creative_refs → platform-ready campaign setup), gtm-experiment-engine (variant assignment) |

## Approval gate

`brand_impacting` + `legal_regulated` + `budget_threshold` (if > $25k).

## KPIs

| KPI | Target |
|---|---|
| Campaigns produced | ≥3 |
| Variants per ad group | 3 |
| LP match score | ≥ 0.85 |
| Char limit compliance | 100% |

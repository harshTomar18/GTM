# Agent: phase4.paid_media

**Phase:** 4 **Stage:** 4 of 6
**Inputs:** channel_strategy (approved), paid_ad_creative, campaign_calendar (optional)
**Output:** PaidMediaSetupPack (platform → campaign → ad_group → audience + tracking + experiment_matrix)

## Mission

Translate channel strategy + creative into platform-ready campaign setups. Budgets
sum, audiences specific, UTMs templated, LP matches validated, experiments on ≥50%
of campaigns.

## Distinctive features

- **Budget sums enforced.** Per platform sum must match channel_plan ±5%.
- **Audience source_layer named.** "1st-party data" generic = redo.
- **Bid ↔ objective alignment.** Mismatches caught.
- **LP match validated** against website_copy_pack.
- **Experiment matrix on ≥50%** of campaigns.

## Outputs

| Field | Consumed by |
|---|---|
| `platform_setups[]` | Ad platform admins / Workstream D MCPs (Google Ads, LinkedIn Ads, Meta Ads) for actual platform builds |
| `kpi_benchmarks` | phase5.measurement (target tracking) |
| `experiment_matrix` | gtm-experiment-engine skill (Workstream D activates) |

## Approval gate

`brand_impacting` + `budget_threshold` (CFO if > $25k).

## KPIs

| KPI | Target |
|---|---|
| Platform coverage | 100% |
| Budget sums | within 5% |
| UTMs present | 100% |
| LP match validated | ≥ 80% |
| Experiment coverage | ≥ 50% |

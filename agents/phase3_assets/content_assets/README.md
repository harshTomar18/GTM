# Agent: phase3.content_assets

**Phase:** 3 **Stage:** 2 of 6
**Inputs:** narrative_lock (approved), content_pillars (approved), keyword_intent, audience_intelligence, research_synthesis
**Output:** ContentAssetPack (flagships per pillar + supporting + one-pagers)

## Mission

Produce the cycle's long-form content. Every pillar gets at least one flagship.
POV is opinionated, citations are dense, FAQ sections are AEO-optimized.

## Distinctive features

- **One flagship per pillar minimum.** Pillar coverage is hard-enforced.
- **Citation density tracked.** ≥1.5 per 500 words for flagships.
- **Framework citations required.** Mentioning any authority anchor or framework
  (per `profile.frameworks`) without a citation is an auto-redo_strict.
- **AEO discipline.** ≥5 FAQ pairs per long asset, 40-60 word answers, schema-ready.

## Outputs

| Field | Consumed by |
|---|---|
| `assets[]` | phase3.email_sequences (cite in nurture), phase3.social_content (repurpose), phase4.seo_activation (URL/meta plan), phase4.campaign_calendar (publish dates), phase4.community_activation (distribute in communities) |

## Approval gate

`brand_impacting` + `framework_or_regulated_claims` + `legal_regulated` (if regulated).

## KPIs

| KPI | Target |
|---|---|
| Assets produced | 4-15 (per cycle scale) |
| Citation density (per 500 words) | ≥ 1.5 (flagships) / ≥ 0.8 (supporting) |
| Internal links per asset | ≥ 3 |
| AEO FAQ on ≥1000-word assets | 100% |

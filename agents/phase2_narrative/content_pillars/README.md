# Agent: phase2.content_pillars

**Phase:** 2 **Stage:** 4 of 5
**Inputs:** messaging_matrix (approved), keyword_intent, audience_intelligence
**Output:** ContentPillarSet (3-5 pillars + topic_cluster_map + pillars_avoided)

## Mission

Define 3-5 content pillars the tenant will **own** — each with a stance, an
authority anchor, mapped keyword clusters, and a realistic cadence.

## Distinctive features

- **POV is a stance, not a topic.** "Marketing automation" is a topic. "Marketing
  automation is being measured wrong, and here's the metric that matters" is a
  stance. Topic-shaped pillars auto-redo.
- **Capacity-matched.** Pillar count is dictated by what the team can ship.
  Five pillars at capacity = 1 piece/month = unworkable.
- **Authority anchor required.** Each pillar names WHY US — internal expertise,
  unique data, customer outcomes, or framework alignment.
- **Orphan clusters caught.** ≥80% of keyword clusters from Phase 1 must map to
  some pillar; below that, the pillars or the cluster set are wrong.

## Distinctive questions

- Publishing capacity per pillar per month (determines pillar count).
- Existing pillars from prior cycles (retain / evolve / sunset).
- Off-limits topics (regulatory, brand, partnership).
- Cadence variation (uniform vs differentiated — some hot, some evergreen).

## Outputs

| Field | Consumed by |
|---|---|
| `pillars[]` | phase3.content_assets (briefs map to pillars), phase3.social_content, phase4.seo_activation, phase4.community_activation |
| `topic_cluster_map` | phase4.seo_activation (internal linking strategy) |
| `pillars_avoided` | governance reference — visible in audit log |

## Approval gate

`brand_impacting` → CMO.

## KPIs

| KPI | Target |
|---|---|
| Pillars | 3-5 |
| Keyword cluster coverage | ≥ 80% |
| Pillar uniqueness (not claimable by 3+ competitors) | ≥ 80% |

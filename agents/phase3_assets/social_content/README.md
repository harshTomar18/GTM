# Agent: phase3.social_content

**Phase:** 3 **Stage:** 4 of 6
**Inputs:** narrative_lock (approved), messaging_matrix, content_pillars, audience_intelligence, content_assets (optional)
**Output:** SocialContentPack

## Mission

Build a platform-native social post bank (LinkedIn primary + others per profile)
spanning pillars, formats, and author voices. Hook diversity enforced.

## Distinctive features

- **Hook pattern diversity.** ≤30% same pattern. Real variety.
- **Pillar coverage.** Every pillar gets ≥4 posts.
- **Executive voice safety.** Posts under exec names need explicit declaration in `q_executive_voices_active`.
- **Engagement-bait blocked.** No "comment YES" / "tag a friend" patterns.
- **Hashtag discipline.** No generic clichés.

## Outputs

| Field | Consumed by |
|---|---|
| `posts[]` | phase4.campaign_calendar (scheduling), phase4.community_activation (community-specific reposts) |

## Approval gate

`brand_impacting` + `executive_voice` (per-post, if author_voice_role != brand).

## KPIs

| KPI | Target |
|---|---|
| Posts produced | ≥30 (per platform spec) |
| Format mix | ≥4 distinct formats |
| Pillar coverage | 100% |
| Hook diversity | ≥70% |

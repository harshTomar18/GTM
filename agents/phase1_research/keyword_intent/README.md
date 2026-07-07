# Agent: phase1.keyword_intent

**Phase:** 1 **Stage:** 4 of 5
**Inputs:** brief_intake, audience_intelligence (required); market_research (optional)
**Output:** KeywordCluster[] (8-12) + content_opportunity_map + ai_search_question_keywords

## Mission

Translate audience pain language into the exact search queries the audience types
into Google, Perplexity, ChatGPT, and Gemini — then organize by intent and priority
for downstream content + paid agents.

## Distinctive questions

- Volume floor (50 for B2B, 100 for B2C, lower for niche).
- KD ceiling for primary targets (0-40 quick wins, 40-70 medium-term).
- Branded keyword strategy (defend/compete/ignore).
- Locale expansion (primary only vs all supported).
- AI search priority (aggressive/balanced/skip).

## Decision-making logic

- **Anchor on personas, not categories.** Every cluster names which persona it
  serves; the keywords map to what THAT persona types.
- **Language bank in, keywords out.** Verbatim audience phrases become seed keywords;
  invented "what an SEO person would search for" terms are auto-rejected.
- **Priority distribution enforced.** 30/50/20 P1/P2/P3 is the target. All-P1 is
  unhelpful — we can't serve them all this cycle.

## Outputs

| Field | Consumed by |
|---|---|
| `clusters[]` (KeywordCluster) | phase1.research_synthesis, phase2.content_pillars, phase3.content_assets, phase3.website_copy, phase3.paid_ad_creative, phase4.seo_activation, phase4.paid_media |
| `content_opportunity_map` | phase2.content_pillars, phase3.content_assets, phase4.campaign_calendar |
| `ai_search_question_keywords` | phase3.content_assets (FAQ generation), phase4.seo_activation (AEO) |

## Approval gate

No mandatory agent-level gate. Phase 1 exit gate (on research_synthesis) reviews.
Optional: SEO Lead may sample-review.

## KPIs

| KPI | Target |
|---|---|
| Clusters | 8-12 |
| Total keywords | 100-200 |
| Priority 1 keywords | ~10 (the primary landing-page targets) |
| AI-search question keywords | ≥ 15 |

## Tools

WebSearch (manual keyword discovery). Workstream C adds Ahrefs, SEMrush,
AnswerThePublic, Google Search Console MCPs that fill the volume + KD numbers.

## Failure modes

| Mode | Action |
|---|---|
| Clusters outside 8-12 range | redo |
| < 100 total keywords | redo |
| All same priority | redo |
| Multi-locale tenant but only en-US keywords | redo_strict |

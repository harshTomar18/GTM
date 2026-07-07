# Agent: phase3.website_copy

**Phase:** 3 **Stage:** 1 of 6
**Inputs:** narrative_lock (approved), messaging_matrix, value_proposition, keyword_intent, audience_intelligence
**Output:** WebsiteCopyPack

## Mission

Generate page-level copy (homepage, solution, landing, comparison) tied 1:1 to
keywords + personas, with must-say phrases woven in, must-not-say traps avoided,
brand voice intact, and AEO-friendly FAQs.

## Distinctive questions

- Pages in scope (which types + URL slugs).
- Conversion path per page (demo / trial / download / call).
- Word-count caps per section.
- A/B variant scope (none / hero_only / hero_and_cta / full_page).
- Legally cleared customer names for proof.

## Decision-making logic

- **must_say weave, not crammed.** ≥3 must_say phrases per page, naturally placed.
- **Meta limits hard-enforced.** Title ≤60, meta ≤160. Overflow = auto-redo.
- **FAQ AEO format.** 40-60 words per answer, schema-ready — designed for AI
  citation, not stuffing.
- **Proof clearance enforced.** No named customer without legal clearance.

## Outputs

| Field | Consumed by |
|---|---|
| `pages[]` | phase4.seo_activation (meta + slug → indexable URL strategy), phase4.paid_media (landing_url match) |
| `pages[].variants` | gtm-experiment-engine skill (A/B assignment) |

## Approval gate

`brand_impacting` (CMO) + `legal_regulated` (if regulatory tenant) + `framework_or_regulated_claims` (if any `profile.frameworks` anchor cited).

## KPIs

| KPI | Target |
|---|---|
| Pages produced | 5 (matches q_pages_in_scope) |
| must_say coverage | ≥ 80% per page |
| Primary keyword in H1 | 100% |
| Meta within limits | 100% |

## Failure modes

| Mode | Action |
|---|---|
| must_not_say violation | redo_strict |
| Meta overflow | redo |
| Primary keyword missing from H1 | redo |
| LP/ad promise mismatch | escalate_to_human |

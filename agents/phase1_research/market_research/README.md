# Agent: phase1.market_research

**Phase:** 1 (Research) **Stage:** 2 of 5
**Inputs:** `phase1.brief_intake.output`
**Output schema:** `CompetitorProfile:v1.0.0` (array, plus market_landscape and positioning_whitespace blocks)

## Mission

Map the market landscape and produce a profile per direct competitor with evidence-backed
claims, then identify positioning whitespace that {{tenant}} could plausibly own.

## Distinctive questions

- Preferred analyst sources (Gartner/Forrester/IDC/vertical-specific) — anchors
  research instead of starting cold.
- Sub-segments to explicitly ignore — prevents scope creep.
- Indirect/emerging competitors beyond the user's stated list.
- Pricing research depth — tenant-controlled scope on a sensitive area.

## Decision-making logic

1. **No invented competitors.** Hard rule: profile only what user supplied.
2. **Every claim cited.** Either inline URL/source-name or `[RESEARCH NEEDED]`.
3. **Whitespace must be specific.** "Be more customer-focused" isn't whitespace; "Position around audit-trail completeness, which 0 of 5 competitors lead with" is.
4. **Regulatory section mandatory** when `profile.regulatory_constraints` is set.

## Outputs

| Field | Schema | Consumed by |
|---|---|---|
| `competitors[]` | `CompetitorProfile:v1.0.0` | phase1.research_synthesis, phase2.positioning, phase3.sales_enablement, phase4.outbound_partner |
| `market_landscape` | (inline) | phase1.research_synthesis, phase2.positioning |
| `positioning_whitespace` | (inline) | phase2.positioning, phase5.competitive_pulse |

## Approval gate

No mandatory gate at the agent level. The Phase 1 exit gate (CMO + SalesLeader on
research_synthesis) covers this output. SME may opt in for framework-heavy claims.

## KPIs

| KPI | Target |
|---|---|
| Competitors profiled | 5 (range 4-6) |
| Citation density | ≥ 0.80 |
| Median source freshness | ≤ 180 days |
| Whitespace angles | ≥ 3 |

## Tools

WebSearch, WebFetch (built-in). Workstream C adds Perplexity, Ahrefs, SimilarWeb,
G2 MCPs.

## Failure modes

| Mode | Action |
|---|---|
| Hallucinated competitor | redo_strict |
| Missing citations | redo |
| Stale sources (median > 365d) | redo |
| Weak whitespace (<3 angles) | escalate_to_human |

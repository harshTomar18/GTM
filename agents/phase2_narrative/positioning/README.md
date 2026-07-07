# Agent: phase2.positioning

**Phase:** 2 **Stage:** 1 of 5
**Inputs:** research_synthesis, audience_intelligence, market_research
**Output:** 2-3 PositioningStatement variants + a recommendation

## Mission

Produce 2-3 **meaningfully distinct** positioning statements (owning, challenging,
creating) — not three flavors of the same idea — using Moore + Dunford frames.
Recommend one with rationale.

## Distinctive features

- **Variants are different SHAPES.** Three variants of the same positioning are an
  auto-redo. The whole point is to give the CMO/CEO real choices.
- **Differentiation test enforced.** Each statement must FAIL when you substitute
  a competitor's brand in. If a competitor could equally claim it, redo.
- **Recommendation is opinionated.** No "any could work" — pick one + name what
  could kill it.

## Distinctive questions

- Category strategy: owning / creating / challenging.
- Named customers we can reference in copy.
- Category creation tolerance (do we have 18+ months for market education?).
- Forbidden angles (price wars, AI claims we can't demo, partnership-constrained competitors).

## Outputs

| Field | Consumed by |
|---|---|
| `variants[]` | CMO + CEO (choose between in approval) |
| `recommendation` | phase2.value_proposition (drives value-prop anchoring) |
| chosen variant (after approval) | phase2.messaging_matrix, phase3.website_copy, phase3.paid_ad_creative, phase4.outbound_partner |

## Approval gate

`brand_impacting` + `executive_voice` → CMO + CEO. **Positioning is CEO-level.**
Phase 2 cannot proceed until one variant is chosen.

The CMO + CEO should:
1. Read all variants side-by-side (not sequentially — comparison matters).
2. Apply the "substitute competitor name" test mentally.
3. Pick one. Explain to the team why this one, not the others.

## KPIs

| KPI | Target |
|---|---|
| Variants produced | 2-3 |
| Differentiation score (LLM-judge vs competitors) | ≥ 0.75 |
| Language resonance (vs audience language bank) | ≥ 0.75 |

## Failure modes

| Mode | Action |
|---|---|
| Variants are minor rewordings of each other | redo_strict |
| Differentiation test fails (competitor could claim same statement) | redo_strict |
| No variant aligns with whitespace | redo |

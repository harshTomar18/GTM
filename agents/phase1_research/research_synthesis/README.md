# Agent: phase1.research_synthesis

**Phase:** 1 **Stage:** 5 of 5 (Phase 1 exit gate)
**Inputs:** brief_intake, market_research, audience_intelligence, keyword_intent — ALL required
**Output:** ResearchDossier (7 sections + pressure-test)

## Mission

Compress all Phase 1 outputs into one **opinionated** strategic document that drives
every Phase 2/3/4 decision. Run a VP-Marketing pressure-test. This is the most
important document in the entire cycle — every team member references it throughout.

## Distinctive features

- **The strategic_recommendations section MUST be opinionated.** Pick one positioning
  angle. Rank three messages. Name two things to NOT say. Hedging is auto-rejected.
- **Built-in pressure-test pass.** After drafting the 7 sections, the agent runs a
  VP-Marketing-style adversarial review on positioning, audience, evidence, timing,
  and messages. `pressure_test_passed` only flips true when all 5 tests pass or
  have documented mitigations.
- **Surfaces assumptions as content.** The most valuable section is the OPEN
  QUESTIONS — it forces honesty about what the cycle is betting on.

## Outputs

| Field | Consumed by |
|---|---|
| `ResearchDossier` | EVERY downstream agent — Phase 2 (positioning, value prop, messaging, pillars, narrative lock), Phase 3 (asset creation reads strategic_recommendations + language excerpts), Phase 4 (channel strategy, calendar), Phase 5 (measurement KPI framing) |

## Approval gate

`phase_exit_gate` — **CMO + SalesLeader, blocks downstream.** Phase 2 cannot
begin until this is approved.

The CMO + SalesLeader should personally read:
1. `strategic_recommendations` (is the positioning angle defensible?)
2. `open_questions_assumptions` (are these the right assumptions to flag?)
3. The pressure-test section (do the mitigations hold up?)

## KPIs

| KPI | Target |
|---|---|
| All 7 sections present | 100% |
| Pressure-test issues raised | ≥ 3 (under-raising = suspicious) |
| Redo iterations to approval | ≤ 1 (higher = upstream quality issue) |

## Tools

WebSearch (optional, for citation backfill). No new external tools — synthesis
agent.

## Failure modes

| Mode | Action |
|---|---|
| Any of 7 sections missing/empty | redo_strict |
| pressure_test not run | redo |
| strategic_recs generic / hedging language | redo_strict |

## Common reasons for rejection by CMO

1. **Positioning angle too crowded.** "We position around customer-centricity" —
   so does every competitor. Reject with: "Tighten to a positioning angle no
   competitor in the matrix actually owns."
2. **Wrong primary persona.** Sales Leader recognizes the persona doesn't match
   real pipeline. Reject with: "Switch primary to <persona>; here's why...".
3. **Too many lead messages.** Three is the max. If the agent returned five, push
   back: "Rank to three and cut the rest. Three is what humans can carry into
   meetings."
4. **No assumptions surfaced.** The dossier is silent on what we're betting on.
   Reject with: "List five specific assumptions; the highest-risk three become
   things we test in Phase 4."

## Why this agent matters disproportionately

It's the boundary between "we hope" and "we know." Phase 2 spends 5+ agent runs
operationalizing whatever strategic_recommendations says. If those recs are wrong,
five downstream artifacts are wrong, and the cycle either fails or burns a redo
budget recovering. The 0.80 auto_redo_threshold (versus 0.70-0.75 elsewhere)
reflects this asymmetry.

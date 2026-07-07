# Agent: phase1.brief_intake

**Phase:** 1 (Research & Market Intelligence)
**Stage:** 1 of 5
**Entrypoint:** yes (first agent in every cycle)
**Output schema:** `BriefIntake:v1.0.0`

## Mission

Convert raw user intent into a **structured campaign brief** + a **15-20 question
research-question list** that downstream Phase 1 agents will answer.

This agent is **not creative**. It does not invent. It structures what the user
already knows and surfaces the gaps as questions.

## How it works

1. **Plan stage** asks the user 10 required questions via the MVC gate (see
   `questions.yaml`). Reusable answers (`cycle.objective.primary`,
   `profile.known_competitors`) persist across cycles.
2. **Gather stage** reads tenant profile to ground the brief in declared ICP,
   industry, frameworks.
3. **Synthesize stage** structures the user's answers into the BriefIntake shape
   and generates 15-20 research questions in 4 categories.
4. **Write stage** applies brand voice and ensures no banned phrases.
5. **Self-review stage** scores against the rubric (research question count,
   objective quantification, competitor specificity, persona naming, language
   verbatim-asking, brand voice compliance).

## Distinctive questions it asks

- "Be specific and quantified" on the business objective — refuses vague goals.
- "Describe one specific deal you lost recently" — anchors downstream agents on
  real pain instead of hypothetical pain.
- "What do you ALREADY KNOW" — prevents downstream agents from re-researching
  facts the user can supply for free.

## Decision-making logic

The agent enforces three hard rules:

1. **Objective must be quantified or flagged.** If the user's objective is vague,
   the agent inserts `[ASSUMPTION: ...]` markers calling out what it inferred —
   never silently invents numbers.
2. **At least 15 research questions** across market/competitor/audience/language.
   Fewer = auto-redo.
3. **Every research question is answerable.** No "what is X?" — must be phrased
   so a downstream agent can execute a search/synthesis.

## Dependencies

None. This is the cycle entrypoint.

## Outputs

| Artifact | Schema | Tier | Goes to |
|---|---|---|---|
| BriefIntake | `BriefIntake:v1.0.0` | T2 | phase1.market_research, phase1.audience_intelligence, phase1.keyword_intent |

## Approval checkpoint

Policy `brand_impacting` → CMO sample-review. The brief itself rarely gets rejected
— it's a structuring agent, not a synthesis agent — but the CMO confirms the
business objective is correct before downstream effort is spent.

## KPIs

| KPI | Target | What good looks like |
|---|---|---|
| research_question_coverage | ≥ 0.85 | 85% of generated questions get answered by end of Phase 1 |
| brief_completeness | ≥ 0.90 | 90% of required fields filled, not skipped |
| assumption_count_flagged | ≥ 3 | At least 3 surfaced assumptions per brief |

## Memory / context requirements

**Reads:**
- `profile.company.*`, `profile.industry.*`, `profile.icp_archetypes`, `profile.lob`, `profile.frameworks`
- T1/T2 answers under `cycle.objective.primary`, `cycle.icp.primary_buyer`, `cycle.timeline`, `cycle.budget.total_usd`, `profile.known_competitors`

**Writes:**
- T2 artifact at `phase1.brief_intake.output`
- T1 promotion of all reusable answers (so future cycles don't re-ask the same brand-stable questions)

## Tools / APIs

None. This agent is purely conversational + structural. No web search, no MCP calls.

## Failure modes

| Mode | Detection | Auto-mitigation |
|---|---|---|
| vague_objective | business_objective < 40 chars OR no quantifiable success | redo_strict (require [ASSUMPTION] markers) |
| missing_competitors_in_known_market | known_competitors empty AND industry maturity != emerging | escalate_to_human (the user must list real competitors) |
| research_questions_below_floor | total < 15 | redo |

## Escalation rules

- Vague objective after 3 redo attempts → escalate to user; do NOT proceed.
- Missing competitors in a known market → block the cycle until user supplies them.

## Collaboration with other agents

- **Downstream consumers** (all subscribe to this output): phase1.market_research,
  phase1.audience_intelligence, phase1.keyword_intent, phase1.research_synthesis.
- **Does not consume** any other agent's output (entrypoint).

## Automation opportunities

- **CRM pre-population:** if the user has HubSpot/Salesforce connected, the
  agent could pre-fill `q_known_competitors` from the CRM's competitor field
  and `q_recent_lost_deal` / `q_recent_won_deal` from the latest closed-lost /
  closed-won opportunity. (Workstream C MCP integration.)
- **Profile-driven defaults:** if the tenant has run a prior cycle, propose the
  prior cycle's objective as a starting point ("Same as last cycle? Or different?").

## Human review areas

The CMO should personally read:
1. The `business_objective` (is this what we're really chasing?)
2. The `unknowns[]` list (are the surfaced assumptions the right ones to flag?)
3. The first 5 `research_questions.audience` items (are we asking about the right
   personas?)

If any of those three feel off, reject with a specific comment. The redo loop
will reframe.

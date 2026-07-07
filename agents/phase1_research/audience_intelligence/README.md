# Agent: phase1.audience_intelligence

**Phase:** 1 **Stage:** 3 of 5
**Inputs:** `phase1.brief_intake.output`, `phase1.market_research.output` (optional)
**Output:** PersonaSpec[] (2-3 personas) + language_bank + jtbd_map

## Mission

Build **evidence-based** personas. The profile says who to study; this agent
discovers who they actually are by mining Reddit, forums, G2, interview transcripts.

## Distinctive questions

- Existing customer research sources (transcripts, Gong/Chorus, support tickets).
- Communities/subreddits to mine (the watering holes).
- G2/Capterra category URLs for concentrated pain language.
- Which ICP archetype is THE primary for this cycle (we go deep on 1 + 2 secondary).

## Decision-making logic

- **Evidence-first.** Every pain point, every language phrase has a verbatim quote
  + citation. No paraphrased "they struggle with..."
- **Watering holes must be named.** "LinkedIn" doesn't count; "the FinOps Slack" does.
- **Personas extend archetypes.** If the profile says `CFO`, we don't return "CFO";
  we return "early-stage SaaS CFO with controller background" with the texture that
  drives downstream messaging.

## Outputs

| Field | Consumed by |
|---|---|
| `personas[]` (PersonaSpec) | phase1.research_synthesis, phase1.keyword_intent, phase2.positioning, phase2.value_proposition, phase2.messaging_matrix, EVERY phase 3 agent, phase4.outbound_partner, phase4.community_activation |
| `language_bank_totals` + embedded phrases | phase2.messaging_matrix, phase3.* (copy agents) |
| `jtbd_map` | phase2.positioning, phase2.value_proposition |

This is one of the highest-leverage outputs in the entire system. A weak persona
poisons every downstream artifact.

## Approval gate

`brand_impacting` → CMO. Plus: Sales Leader should review for "do these personas
match real pipeline?"

## KPIs

| KPI | Target |
|---|---|
| Personas produced | 2-3 |
| Verbatim quotes per persona | ≥ 8 |
| Language bank total phrases | ≥ 40 |
| Distinct source citations | ≥ 6 |

## Tools

WebSearch, WebFetch. Workstream C adds SparkToro, Reddit API, G2, LinkedIn Sales
Nav, Apollo, Gong MCPs.

## Failure modes

| Mode | Action |
|---|---|
| Fabricated personas (no verbatim quotes) | redo_strict |
| Language bank < 40 | redo |
| Persona identical to ICP archetype with no added depth | escalate_to_human |

## Human review areas

CMO + Sales Leader should:
1. Read the pain_points and ask "do these match what I hear on customer calls?"
2. Audit 3-5 quotes for accuracy (click through to source).
3. Stress-test by naming a real customer and asking "which of these personas is them?"

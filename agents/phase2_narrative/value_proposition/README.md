# Agent: phase2.value_proposition

**Phase:** 2 **Stage:** 2 of 5
**Inputs:** positioning (approved variant), audience_intelligence, research_synthesis
**Output:** ValuePropositionSet (core + per-persona + proof_points)

## Mission

Translate the approved positioning into a **core value prop** + **per-persona
variants** + **tied proof points**. Force quantification: every outcome is
measurable or marked `[RESEARCH NEEDED]`.

## Distinctive features

- **Requires an APPROVED positioning.** Cannot run on a draft positioning — it
  needs the chosen variant to anchor on.
- **Quantification enforced.** "Save time" without a number is auto-redo.
- **Legal clearance honored.** Only named customers cleared by the user appear
  by name; others get descriptive references.
- **Objection answers, not deflections.** Each persona's top objections get a
  real response, not "we address that concern through X."

## Distinctive questions

- Proof library path (existing case studies, customer outcomes).
- Legally cleared customer names.
- Outcome metrics we actually measure.
- Proof freshness floor (reject claims older than X months).

## Outputs

| Field | Consumed by |
|---|---|
| `core_value_prop` | phase3.website_copy (hero), phase3.paid_ad_creative |
| `per_persona[]` | phase2.messaging_matrix, phase3.email_sequences, phase3.sales_enablement |
| `proof_points[]` | phase3.website_copy, phase3.sales_enablement, phase3.paid_ad_creative |

## Approval gate

`brand_impacting` → CMO. `customer_named` policy may add Legal if any named
customer appears in proof_points.

## KPIs

| KPI | Target |
|---|---|
| Persona coverage | 100% (every persona has a block) |
| Quantified outcomes | ≥ 60% of key_benefits |
| Proof density | ≥ 1.5 proofs per benefit |

## Failure modes

| Mode | Action |
|---|---|
| Persona missing | redo |
| Unquantified outcomes < 40% | redo |
| Customer named without legal clearance | escalate_to_human |

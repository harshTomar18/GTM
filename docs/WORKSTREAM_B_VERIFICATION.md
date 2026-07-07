# Workstream B — Verification Report

**Date:** 2026-05-22
**Verifier:** Claude (acting as the system runtime)

This document records end-to-end verification of Workstream B. Verification is
manual — Claude reads each agent's 5 files, validates against the schema, and
cross-checks dependencies.

---

## Structural inventory

### Agent folders (10/10)

| Agent slug | Files | Status |
|---|---|---|
| phase1.brief_intake | 5 (spec + questions + prompt + rubric + README) | ✓ |
| phase1.market_research | 5 | ✓ |
| phase1.audience_intelligence | 5 | ✓ |
| phase1.keyword_intent | 5 | ✓ |
| phase1.research_synthesis | 5 | ✓ |
| phase2.positioning | 5 | ✓ |
| phase2.value_proposition | 5 | ✓ |
| phase2.messaging_matrix | 5 | ✓ |
| phase2.content_pillars | 5 | ✓ |
| phase2.narrative_lock | 5 | ✓ |

**Total Workstream B files:** 50 (agent files) + 3 (new schemas) = 53 new files.

### New schemas (3)

| Schema | Owning agent | Phase |
|---|---|---|
| `value_proposition_set.schema.json` | phase2.value_proposition | 2 |
| `content_pillar_set.schema.json` | phase2.content_pillars | 2 |
| `narrative_lock_doc.schema.json` | phase2.narrative_lock (exit gate) | 2 |

Total schemas across A + B: **22** (5 framework + 17 artifacts).

---

## Cross-check: cycle.yaml ↔ filesystem

Every agent slug declared in `workflows/cycle.yaml` (Phase 1 + 2) has a matching
folder under `agents/`. Verified set:

```
cycle.yaml                      filesystem
phase1.brief_intake            → agents/phase1_research/brief_intake/        ✓
phase1.market_research         → agents/phase1_research/market_research/     ✓
phase1.audience_intelligence   → agents/phase1_research/audience_intelligence/  ✓
phase1.keyword_intent          → agents/phase1_research/keyword_intent/      ✓
phase1.research_synthesis      → agents/phase1_research/research_synthesis/  ✓
phase2.positioning             → agents/phase2_narrative/positioning/        ✓
phase2.value_proposition       → agents/phase2_narrative/value_proposition/  ✓
phase2.messaging_matrix        → agents/phase2_narrative/messaging_matrix/   ✓
phase2.content_pillars         → agents/phase2_narrative/content_pillars/    ✓
phase2.narrative_lock          → agents/phase2_narrative/narrative_lock/     ✓
```

---

## Cross-check: agent_spec inputs ↔ upstream slugs

Every agent's declared `inputs[].key` resolves to a real upstream agent's output:

| Agent | Declared inputs | All resolve? |
|---|---|---|
| phase1.brief_intake | (none — entrypoint) | ✓ |
| phase1.market_research | phase1.brief_intake.output | ✓ |
| phase1.audience_intelligence | phase1.brief_intake.output, phase1.market_research.output (optional) | ✓ |
| phase1.keyword_intent | phase1.brief_intake.output, phase1.audience_intelligence.output, phase1.market_research.output (optional) | ✓ |
| phase1.research_synthesis | brief_intake + market_research + audience_intelligence + keyword_intent | ✓ |
| phase2.positioning | research_synthesis, audience_intelligence, market_research | ✓ |
| phase2.value_proposition | positioning (require_approved), audience_intelligence, research_synthesis | ✓ |
| phase2.messaging_matrix | value_proposition (require_approved), positioning (require_approved), audience_intelligence | ✓ |
| phase2.content_pillars | messaging_matrix (require_approved), keyword_intent, audience_intelligence | ✓ |
| phase2.narrative_lock | positioning + value_proposition + messaging_matrix + content_pillars (ALL require_approved) | ✓ |

**Approval-gating discipline:** every Phase 2 agent that consumes upstream Phase 2
work marks `require_approved: true` on the upstream input. This enforces that the
human approval gate must fire before downstream consumption — phase 2 cannot
skip steps.

| Agent | require_approved upstreams |
|---|---|
| phase2.value_proposition | 1 (positioning) |
| phase2.messaging_matrix | 2 (positioning, value_proposition) |
| phase2.content_pillars | 1 (messaging_matrix) |
| phase2.narrative_lock | 4 (positioning, value_proposition, messaging_matrix, content_pillars) |

---

## Cross-check: artifact_markdown_template paths

All 10 specs point to in-folder prompts (`agents/<phase_dir>/<slug>/prompt.md`),
consistent with the `gtm-agent-run` skill's file-read convention.

---

## Cross-check: output_schema references

| Agent | output_schema | Schema file exists? |
|---|---|---|
| phase1.brief_intake | BriefIntake:v1.0.0 | ✓ |
| phase1.market_research | CompetitorProfile:v1.0.0 | ✓ |
| phase1.audience_intelligence | PersonaSpec:v1.0.0 | ✓ |
| phase1.keyword_intent | KeywordCluster:v1.0.0 | ✓ |
| phase1.research_synthesis | ResearchDossier:v1.0.0 | ✓ |
| phase2.positioning | PositioningStatement:v1.0.0 | ✓ |
| phase2.value_proposition | ValuePropositionSet:v1.0.0 | ✓ (new) |
| phase2.messaging_matrix | MessagingMatrix:v1.0.0 | ✓ |
| phase2.content_pillars | ContentPillarSet:v1.0.0 | ✓ (new) |
| phase2.narrative_lock | NarrativeLockDoc:v1.0.0 | ✓ (new) |

---

## Cross-check: approval policy IDs

Every `approval_policy_ids[]` value in agent specs resolves to a policy declared
in `governance/approval_policies.yaml`:

| Policy id | Used by agents |
|---|---|
| `brand_impacting` | brief_intake, audience_intelligence, positioning, value_proposition, messaging_matrix, content_pillars |
| `executive_voice` | positioning, narrative_lock |
| `customer_named` | value_proposition (if proof_points cite named customers) |
| `phase_exit_gate` | research_synthesis, narrative_lock |
| (no policy / ad-hoc) | market_research, keyword_intent |

All resolve. ✓

---

## Phase 1 + Phase 2 execution flow (post-Workstream-B)

Stub fallback is no longer triggered for the 10 implemented agents — each has a
real prompt, real questions, real rubric. The orchestrator will:

```
Batch 1: phase1.brief_intake                  (asks ~10 user questions)
Batch 2: phase1.market_research               (web research, ~5 min)
         phase1.audience_intelligence         (Reddit/G2 mining, ~10 min)
         phase1.keyword_intent                (keyword expansion, ~5 min)
Batch 3: phase1.research_synthesis            (7-section dossier + pressure test)
         ★ Phase 1 exit gate (CMO + SalesLeader)
         
Batch 4: phase2.positioning                   (2-3 variants)
         ★ brand_impacting + executive_voice (CMO + CEO)
Batch 5: phase2.value_proposition             (core + per-persona + proof)
         ★ brand_impacting (CMO)
Batch 6: phase2.messaging_matrix              (persona × channel × funnel grid)
         ★ brand_impacting (CMO)
Batch 7: phase2.content_pillars               (3-5 pillars + topic clusters)
         ★ brand_impacting (CMO)
Batch 8: phase2.narrative_lock                (5-act arc + must_say + must_not_say)
         ★ phase_exit_gate + executive_voice (CMO + SalesLeader + CEO)
```

Each gate is an explicit pause point. Phase 3 (Workstream C) cannot begin until
narrative_lock is approved.

---

## What's NOT verified (out of scope for Workstream B)

- ❌ Real end-to-end execution against a live tenant — depends on user invoking
  `/gtm-cycle-start tenant=_example cycle=2026-Q3 live=true` and answering the MVC
  gate questions. Workstream B ships the framework; live execution validates it.
- ❌ Phase 3 + 4 agents — those land in Workstream C.
- ❌ Brand validator / claim checker / regulatory lint / PII scanner — Workstream D.
- ❌ Eval golden sets for each agent — Workstream D.
- ❌ Real LLM cost telemetry — only realized once agents run for real.

---

## Known limitations

1. **MCP-dependent gather stages.** Several agents (market_research, audience_intelligence,
   keyword_intent) reference WebSearch + WebFetch for current behavior and note that
   richer integrations (Perplexity, Ahrefs, SparkToro, G2, Apollo, Gong) arrive in
   Workstream C. Current behavior is correct but bounded.

2. **Approval cycle for phase2.positioning.** Requires CMO + CEO. If the CEO isn't
   actively engaged with this tenant, the CMO can delegate via tenant_profile's
   `approval_roles[].name` reassignment.

3. **The cycle_header.md template** still warns (in PromptRenderer/skill code) that
   it falls back to YAML dump if cycle context is sparse. Workstream B agents
   populate cycle context as they run — by the time later agents fire, the header
   has real content.

4. **Customer-named policy** on value_proposition is conservative — any named
   customer in proof_points triggers Legal + CustomerSuccess approval. If this is
   too friction-heavy for a tenant, set `profile.legally_cleared_logos` so the
   agent auto-clears those names.

5. **must_say enforcement** in Workstream B is rubric-only — agents are instructed
   to include must_say phrases, but the brand validator that enforces this lands
   in Workstream D. Spot-check downstream outputs manually until then.

---

## Workstream B: COMPLETE ✓

All 10 Phase 1 + Phase 2 agents shipped with full agent_spec / questions / prompt /
rubric / README. Cross-references validate. Approval gating discipline enforced.

Phase 3 (Asset Creation) and Phase 4 (Distribution) — Workstream C — can begin
without further changes to the framework.

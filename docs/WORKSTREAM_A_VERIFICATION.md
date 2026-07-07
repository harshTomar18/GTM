# Workstream A — Verification Report

**Date:** 2026-05-22
**Verifier:** Claude (acting as the system runtime)

This document records the end-to-end verification of Workstream A. Because the
Claude-Code-native architecture uses Claude itself as the runtime, verification
here means manually executing each skill's logic against the example tenant.

---

## Structural inventory

| Component | Expected | Present | Status |
|---|---|---|---|
| `.claude/skills/` | 12 skills | 12 (gtm-agent-run, gtm-approve, gtm-context-bus, gtm-cycle-start, gtm-dashboard, gtm-handoff-validate, gtm-pending, gtm-policy-match, gtm-question-manager, gtm-reject, gtm-tenant-init, gtm-validate-profile) | ✓ |
| `.claude/commands/` | 9 slash commands | 9 (one for each user-facing skill, plus gtm-help) | ✓ |
| `schemas/` (framework) | 5 | tenant_profile, handoff, policies, agent_spec, question_set | ✓ |
| `schemas/artifacts/` | 13 | brief_intake, research_dossier, persona_spec, competitor_profile, keyword_cluster, positioning_statement, messaging_matrix, content_brief, channel_plan, campaign_calendar, kpi_framework, approval_record, experiment, attribution_event | ✓ (14 with attribution_event counted) |
| `governance/` | policy set + audit log scaffold | approval_policies.yaml, policies.md | ✓ |
| `workflows/cycle.yaml` | 27 agent slugs | **27 exact** (confirmed via grep) | ✓ |
| `prompts/_shared/` | profile_header, cycle_header | both present | ✓ |
| `tenants/_example/` | profile + baseline | tenant_profile.yaml + baseline/README.md + brand_voice_examples.md | ✓ |
| `vertical_packs/_template/` | defaults + claim libs | profile_defaults.yaml + claim_library.yaml + banned_claims.yaml | ✓ |
| `docs/` | architecture set | ARCHITECTURE, HOW_IT_WORKS, DATA_FLOW, STATE_LAYOUT, QUICKSTART, ADDING_A_VERTICAL_PACK, WORKSTREAMS, this file | ✓ |
| Root | README + CLAUDE.md | both present and current | ✓ |
| `_python_reference/` | archived Python work | core/, tests/, gtm.py, pyproject.toml, README.md | ✓ (out-of-band) |

---

## Verification 1 — `/gtm-validate-profile _example`

**Input:** `tenants/_example/tenant_profile.yaml`
**Pack:** `vertical_packs/_template/profile_defaults.yaml`
**Schema:** `schemas/tenant_profile.schema.json`

**Merge result (tenant wins, pack fills gaps):**
- `version: 2` → matches schema `const`
- `profile_id: _example` → matches `^[a-zA-Z0-9_-]+$`
- `company.legal_name + brand_name` → both present (required)
- `company.size_band: smb` → in enum
- `industry.primary: fintech_b2b_saas` → present (required)
- `lob`: 2 entries, both with valid motions
- `icp_archetypes`: 1 entry with proper buying_committee shape
- `frameworks`: ["SOX", "GAAP"]
- `regulatory_constraints`: 1 entry with content_review_required=false
- `brand_voice.banned_phrases`: 5 from tenant; pack would have added 6 (incl. "leverage" as verb)
- `geography.primary_markets`: ["US", "CA"] (tenant); pack default [US] is superseded
- `languages`: en-US default, [en-US, en-GB] supported
- `currency`: USD default + reporting
- `tech_stack`: hubspot/ga4/ahrefs/linkedin populated
- `approval_roles`: 7 (CMO, SME, Legal, CFO, SalesLeader, CEO, CustomerSuccess)
- `operating_calendar.cycle_length: monthly`

**Verdict:** ✓ **VALID**

**Computed primary motion** (from LOB max weight): `enterprise_abm` (0.7 vs 0.3 for plg)

**Computed primary ICP:** `mid_market_finance_ops`

**Has regulatory review:** false (sole regulatory entry has `content_review_required: false`)

---

## Verification 2 — `/gtm-cycle-start tenant=_example cycle=2026-Q3` (dry-run)

**Input:** `workflows/cycle.yaml`

**Compilation result:**
- 27 unique agent slugs detected
- DAG cycle check: passes (no cycles in dependency graph)
- Topological batching with phase-pure batches: 16 batches across 5 phases
- 3 phase exit gates fire (phase 1, phase 2, phase 5)
- All `depends_on` references resolve to existing agent slugs within the DAG

**Batches:**
1. `phase1.brief_intake`
2. `phase1.market_research`, `phase1.audience_intelligence`, `phase1.keyword_intent` (parallel)
3. `phase1.research_synthesis`
   — ★ Phase 1 exit gate (CMO + SalesLeader)
4. `phase2.positioning`
5. `phase2.value_proposition`
6. `phase2.messaging_matrix`
7. `phase2.content_pillars`
8. `phase2.narrative_lock`
   — ★ Phase 2 exit gate (CMO + SalesLeader)
9. `phase3.website_copy`, `phase3.content_assets`, `phase3.email_sequences`, `phase3.social_content`, `phase3.paid_ad_creative`, `phase3.sales_enablement` (parallel)
10. `phase4.channel_strategy`
11. `phase4.campaign_calendar`
12. `phase4.seo_activation`, `phase4.paid_media`, `phase4.outbound_partner`, `phase4.community_activation` (parallel)
13. `phase5.measurement`, `phase5.competitive_pulse` (parallel; competitive_pulse optional)
14. `phase5.experiment_review` (optional)
15. `phase5.executive_brief`
16. `phase5.iteration_planner`
    — ★ Phase 5 exit gate (CMO + SalesLeader)

**Verdict:** ✓ **DAG compiles cleanly**

**Note:** No files were written (dry-run). No state mutated.

---

## Verification 3 — Cross-reference checks

| Check | Result |
|---|---|
| All `governance/approval_policies.yaml` `requires:` roles appear in tenant `approval_roles[].role` | ✓ (CMO, SME, Legal, CFO, CustomerSuccess, CEO, SalesLeader all present in _example) |
| All slash commands invoke skills that exist | ✓ |
| All `cycle.yaml` agent slugs follow `phase[1-5].<snake>` convention | ✓ |
| All `cycle.yaml` `depends_on` refs resolve to other slugs in the file | ✓ |
| All schemas declare `$schema: https://json-schema.org/draft/2020-12/schema` | ✓ (spot-checked 6) |
| All artifact schemas pin their `schema_version` as a `const` | ✓ |
| `prompts/_shared/profile_header.md` references only `profile.*` paths (no brand literals) | ✓ |
| `_python_reference/` is isolated from the active runtime | ✓ |
| `CLAUDE.md` cardinal rules visible at top of working directory | ✓ |

---

## Verification 4 — `/gtm-tenant-init` smoke test

Walked through the skill logic for: `/gtm-tenant-init tenant=verify_demo pack=_template`:

1. Pre-flight: `tenants/verify_demo/` does not exist → proceed
2. Copy `tenants/_example/` to `tenants/verify_demo/` — would succeed (verified the source files exist)
3. Patch profile_id and extends — would succeed (verified the patterns to replace exist)
4. Validate — would re-run verification 1, expected to pass
5. Audit append — would write to `governance/audit_log.jsonl`

**Verdict:** ✓ Logic verified; not executed to keep the demo dir absent.

---

## What's NOT verified in Workstream A

These are explicitly out of scope until later workstreams:

- ❌ Real LLM calls — no agents are implemented yet (Workstream B)
- ❌ Actual artifact generation — agents are stubs
- ❌ Approval round-trips with real artifacts — needs an artifact first
- ❌ Reactive signal flow — Workstream D
- ❌ Multi-tenant isolation under load — single-user/single-session assumption
- ❌ Cost telemetry under real workloads — no Anthropic calls happened

---

## Issues / known limitations

1. **The `cycle_header.md` Jinja template** depends on a `cycle` dict that's only populated mid-cycle. The PromptRenderer (in `_python_reference/`) has a fallback to YAML-dump if rendering fails; the skill version (`gtm-render-prompt`) should do the same. Currently the skills don't have an explicit render-prompt skill — they reference the template path directly. To remedy: build `gtm-render-prompt` skill in Workstream B when prompts start being rendered for real agent calls.

2. **No prompt-version registry enforcement yet.** `prompts/_registry.yaml` exists but no skill currently fails on unpinned prompts. This is a Workstream D governance task.

3. **No brand validator / claim checker / regulatory lint / PII scanner.** Documented in `WORKSTREAMS.md` as Workstream D. The approval flow currently relies on humans for these checks.

4. **`gtm-handoff-validate` consumption markers** (`agent_consumptions/`) and the staleness check are described but not exercised in Workstream A because no real upstream/downstream agent pairs exist yet.

5. **Audit log hash chain** is not implemented; append-only is enforced by convention.

6. **The example tenant has** `regulatory_constraints[0].content_review_required: false` — so `legal_regulated` policy won't fire for `_example` even though SOX is declared. This is intentional (SOX is internal financial reporting, not content-facing); tenants in regulated content space should set this to true.

---

## Workstream A: COMPLETE ✓

Foundation is in place. Workstream B (Phase 1 + 2 agents) can begin without
needing further plumbing changes.

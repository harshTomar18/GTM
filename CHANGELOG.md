# Prompt Changelog

This file tracks prompt version changes for all 27 agents. Each entry is
referenced by `prompts/_registry.yaml` via `changelog_ref`. Format:
`## <slug>-<version>` + date + what changed.

---

## Phase 1 — Research & Market Intelligence

### brief_intake-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### market_research-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### audience_intelligence-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### keyword_intent-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### research_synthesis-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

---

## Phase 2 — Narrative & Messaging Architecture

### positioning-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### value_proposition-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### messaging_matrix-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### content_pillars-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### narrative_lock-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

---

## Phase 3 — Asset Creation

### website_copy-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### content_assets-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### email_sequences-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### social_content-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### paid_ad_creative-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### sales_enablement-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

---

## Phase 4 — Distribution & Activation

### channel_strategy-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### campaign_calendar-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### seo_activation-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### paid_media-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### outbound_partner-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### community_activation-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

---

## Phase 5 — Measurement & Iteration

### measurement-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### experiment_review-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### executive_brief-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### competitive_pulse-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

### iteration_planner-1.0.0
**Date:** 2026-05-22
**What changed:** Initial release — Workstream D

---

## How to bump a prompt

1. Edit the prompt file (`agents/<phase>/<slug>/prompt.md`).
2. Change the `<!-- prompt_version: X.Y.Z -->` header inside the file.
3. Add a new entry here following the `## <slug>-<version>` format.
4. Update `prompts/_registry.yaml` — bump `@version` suffix and `changelog_ref`.
5. Run eval: `promptfoo eval --config evals/promptfoo.yaml --filter-description "<slug>"`.
6. Attach the eval delta report to your PR. Regression > 1σ blocks merge.

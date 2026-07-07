---
name: gtm-experiment-engine
description: Use this skill to register, assign, monitor, and conclude variant experiments (A/B / multivariate / Thompson-sampling bandits) on Phase 3 + 4 artifacts. Invoked by gtm-agent-run when a write_copy or paid_ad_creative agent emits variants; also invoked by phase5.experiment_review when concluding tests.
---

# Skill: gtm-experiment-engine

## What it does

Manages the lifecycle of variant experiments:

1. **register_experiment** — agents emit variants → this skill writes an `Experiment` record to `tenants/<id>/cycles/<cycle>/experiments/<id>.json` conforming to `schemas/artifacts/experiment.schema.json`.
2. **assign_variant** — at runtime (when a visitor or recipient is matched), pick a variant per the assignment strategy (ab / multivariate / bandit_thompson).
3. **record_outcome** — when a conversion / impression / click is observed (typically via attribution_events), increment the relevant arm's counters.
4. **conclude_experiment** — when sample size is met OR cycle ends, run statistical analysis, declare a winner (or "no significant difference"), and stage a rollout proposal for phase5.experiment_review.

In Workstream C, only **register_experiment** is invoked at agent-emit time. Assignment + outcome + conclude land fully in Workstream D when the runtime can read live attribution data.

## Required inputs (register_experiment)

| Field | Source |
|---|---|
| `experiment_id` | Generated (snake_case) |
| `artifact_ref` | Agent's output key — e.g., `phase3.website_copy.output:page_id=homepage` |
| `arms[]` | From agent output's `variants[]` field |
| `assignment_strategy` | "ab" (default), "multivariate", "bandit_thompson" |
| `sample_size_target` | Per arm — recommend 384 per arm for 5% MDE at 95% confidence (calculator in §Calculations) |
| `success_metric` | "conversion_rate", "ctr", "reply_rate", "demo_request_rate", etc. |

## Steps

### Register

1. Read upstream artifact (e.g., a `WebsiteCopyPack` page with `variants[]`).
2. For each variant, create an `ExperimentArm` entry:
   ```json
   {
     "arm_id": "<variant_label snake_case>",
     "label": "<variant_label>",
     "variant_payload": { /* the variant's content fields */ },
     "impressions": 0,
     "conversions": 0
   }
   ```
3. Compose Experiment record:
   ```json
   {
     "schema_version": "Experiment:v1.0.0",
     "experiment_id": "<uuid or snake_case>",
     "artifact_ref": "<input ref>",
     "arms": [...],
     "assignment_strategy": "ab",
     "sample_size_target": <calculated or supplied>,
     "success_metric": "<from caller>",
     "status": "draft",
     "winner_arm_id": null
   }
   ```
4. Write to `tenants/<id>/cycles/<cycle>/experiments/<experiment_id>.json`.
5. Audit log entry: `experiment.created`.
6. Update the source agent's artifact: set each variant's `experiment_id` field to point at this experiment.

### Activate

When all arms have content + the artifact is approved, flip `status: draft → running`. Audit log: `experiment.assigned` (one entry; full assignment lifecycle lives in Workstream D).

### Conclude (Workstream D)

When `sum(arms.impressions) >= sample_size_target * len(arms)` OR cycle ends:
1. Compute conversion rates per arm.
2. Run statistical test (Chi-square or Fisher's exact for ab; Thompson posterior for bandit).
3. If p < 0.05 AND lift > MDE → declare winner. Else → "no significant difference."
4. Update Experiment: `status: concluded`, `winner_arm_id: <id or null>`.
5. Audit log: `experiment.concluded`.

## Calculations

**Sample size per arm (rough)** for 5% MDE at 95% confidence, baseline 5% conversion:

```
n_per_arm = 16 * baseline * (1 - baseline) / (MDE^2)
         ≈ 16 * 0.05 * 0.95 / 0.0025 ≈ 304 per arm
```

Caller can override `sample_size_target` based on their actual baseline + MDE.

## Output (caller perspective)

```
[experiment] Registered <experiment_id> on <artifact_ref>
   Arms: <count>
   Strategy: ab | multivariate | bandit_thompson
   Sample target: <n per arm>
   Success metric: <metric>
```

## Do NOT

- Don't assign variants when assigning would expose users to unapproved content (require artifact_ref's approval before flipping running).
- Don't declare a winner before reaching `sample_size_target`. Underpowered = unreliable.
- Don't continue an experiment past the cycle's end without explicit user instruction (force a conclude).
- Don't auto-roll-out winners. Rollout is a separate user action via `phase5.experiment_review`.

## Workstream A/B/C/D status

- **A**: skill not yet built (now landed in C).
- **B**: not invoked (agents didn't emit variants).
- **C**: skill **registers** experiments as agents emit variants (website_copy.variants, paid_ad_creative.ad_groups.variants, email_sequences with branch_on).
- **D**: full lifecycle — assignment, outcome recording via attribution_events, conclude with statistical analysis, rollout staging.

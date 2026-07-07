# phase5.iteration_planner

**Phase:** 5 — Measurement & Iteration
**Stage:** 5 (final stage of Phase 5 and of the entire 27-agent GTM cycle)
**Schema slug:** `phase5.iteration_planner`
**Approval gate:** Phase exit gate — CMO + CEO (dual sign-off required)

---

## Purpose

`phase5.iteration_planner` is the last agent in the Universal-GTM-OS cycle DAG.
It is the **Phase 5 exit gate** and the **cycle's final mandatory gate**.

It closes the feedback loop by converting measurement outcomes, experiment
learnings, and competitive signals into a concrete, evidence-grounded
**NextCycleBriefDraft** — a fully structured `NextCycleBriefDraft:v1.0.0`
document that seeds the next cycle's `phase1.brief_intake` agent.

The output is not a summary or retrospective report. It is an actionable
next-cycle plan adjustment: every prior objective gets an explicit decision,
every channel recommendation is grounded in measurement data, and the brief
draft pre-fills `phase1.brief_intake` so the next cycle can start immediately
upon CMO + CEO approval.

When the output frontmatter carries `next_cycle_seed_ready: true`, the system
signals that `phase1.brief_intake` may consume this draft to pre-fill the next
cycle's brief — closing the feedback loop across cycles.

---

## Position in the DAG

```
phase5.measurement ──────────────────────────┐
phase5.experiment_review (optional) ─────────┤
phase5.competitive_pulse (optional) ──────────┼──► phase5.iteration_planner
phase5.executive_brief (CMO-approved) ───────┤         │
phase1.brief_intake (prior cycle) ───────────┘         │
                                                        ▼
                                             [CMO + CEO Approval Gate]
                                                        │
                                                        ▼
                                          next cycle: phase1.brief_intake
```

This agent completes **Workstreams B + C + D** — the full 27-agent cycle.

This agent has no downstream agents within the current cycle. Its approved
output is the entry point for the next cycle.

---

## Inputs

| Key | Schema | Required | Notes |
|---|---|---|---|
| `phase5.executive_brief.output` | `ExecutiveBrief:v1.0.0` | Yes | Must be **CMO-approved** — agent is blocked until approval is recorded |
| `phase5.measurement.output` | `KPIFramework:v1.0.0` | Yes | KPI actuals, channel performance, attribution data |
| `phase5.experiment_review.output` | `ExperimentReviewReport:v1.0.0` | No | Winning arms, losers, learnings; carry-forward logic skipped if absent |
| `phase5.competitive_pulse.output` | `CompetitivePulseReport:v1.0.0` | No | Competitive signals; top 3 actionable signals inform positioning/battlecard updates |
| `phase1.brief_intake.output` | `BriefIntake:v1` | Yes | Prior cycle brief — provides baseline for objective decisions and delta analysis |

**Profile keys used:** `profile.operating_calendar`, `profile.icp_archetypes`, `profile.brand_voice`

---

## Output

| Field | Value |
|---|---|
| Artifact key | `phase5.iteration_planner.output` |
| Schema | `NextCycleBriefDraft:v1.0.0` |
| Storage path | `tenants/<tenant_id>/cycles/<cycle_id>/next_cycle_brief_draft.json` |
| Frontmatter flag | `next_cycle_seed_ready: true` (signals phase1.brief_intake may consume this draft) |

The approved NextCycleBriefDraft is loaded as the seed document for the next
cycle's `phase1.brief_intake` run. Operators may amend it during that intake,
but the iteration_planner output is the authoritative starting point.

---

## Approval Gate — Phase Exit Gate (CMO + CEO)

This is the **Phase 5 exit gate** and the **cycle's final mandatory gate**.

- Both CMO and CEO must record approval on the NextCycleBriefDraft before any
  next cycle activity begins.
- If either approver rejects: reviewer feedback is injected as an additional
  input block and the agent re-runs the write and self-review stages.
- Maximum revision attempts before operator escalation: 2 (configurable in
  `governance/approval_policies.yaml`).

---

## Questions

| ID | Label | Required | Type | Notes |
|---|---|---|---|---|
| `q_next_cycle_primary_objective` | Primary objective for the next cycle | Yes | text | Stored as `next_cycle.objective.primary` |
| `q_reopen_narrative_lock` | Should NarrativeLockDoc be re-opened? | Yes | select | Options: `yes_full_reopen`, `yes_minor_update_only`, `no_lock_holds` |
| `q_budget_direction` | Next-cycle budget direction vs. this cycle | Yes | select | Options: `increase_10_to_25pct`, `maintain_flat`, `decrease_10_to_25pct`, `reallocate_same_total`, `tbd_awaiting_cfo` |
| `q_channels_to_discontinue` | Channels to drop from next cycle | No | text | Evidence-based reason required |
| `q_new_motions_to_test` | New GTM motions to add next cycle | No | text | Logged as experiment candidates |

The two required questions (`q_next_cycle_primary_objective`, `q_reopen_narrative_lock`)
are the minimum gate for the agent to proceed. `q_budget_direction` is also
required to prevent the `budget_delta_unspecified` failure mode.

---

## Output Sections

The NextCycleBriefDraft contains exactly eight required sections:

1. **Cycle Summary** — 3–4 sentences: what we set out to do, headline result, most important learning
2. **Objective Decisions** — table with carry_forward / drop / modify for every prior objective
3. **Channel Performance & Recommendations** — per channel: what worked, what to change, budget direction, evidence citation
4. **Experiment Rollouts** — winning variants to implement as next-cycle defaults (or explicit skip if experiment_review absent)
5. **Narrative Lock Decision** — yes_full_reopen / yes_minor_update_only / no_lock_holds with specific rationale
6. **Competitive Adjustments** — 2–3 positioning or battlecard adjustments (or explicit skip if competitive_pulse absent)
7. **Next Cycle Brief Draft** — structured pre-fill for phase1.brief_intake with all required fields
8. **Open Questions for CMO + CEO Review** — forward-looking decision points requiring leadership input

---

## KPIs

| KPI | Target | Timing |
|---|---|---|
| `objective_carryforward_decision` | 1.0 (all objectives have a decision) | Output validation |
| `channel_recommendations_grounded` | 1.0 (all channel recommendations cite evidence) | Output validation |
| `carry_over_experiments_listed` | 1.0 when experiment_review present | Output validation |
| `narrative_lock_reopen_recommendation` | 1 boolean present | Output validation |

---

## Self-Review Rubric

| Dimension | Weight | What It Checks |
|---|---|---|
| `evidence_grounding` | 0.35 | Every recommendation traces to a named KPI result, experiment ID, or competitive signal |
| `completeness` | 0.30 | All prior objectives have decisions; all 8 sections present; budget direction stated; narrative lock boolean + rationale present |
| `actionability` | 0.20 | Next Cycle Brief Draft is specific enough for phase1.brief_intake to run with minimal amendment |
| `forward_focus` | 0.15 | Document is oriented toward next-cycle action, not retrospective recap |

Pass threshold: 0.75. Auto-redo on fail. Maximum 3 redo attempts before operator escalation.

---

## Failure Modes

| ID | Trigger | Remediation |
|---|---|---|
| `objective_without_decision` | Any prior objective missing carry_forward/drop/modify status | Redo — add explicit decision row for every objective |
| `recommendation_without_evidence` | Any channel/budget recommendation missing evidence citation | Redo — add evidence_citation for every recommendation |
| `narrative_lock_opinion_missing` | No yes/no recommendation on NarrativeLockDoc, or rationale absent | Redo — add Narrative Lock Decision section with boolean + rationale |
| `budget_delta_unspecified` | Next-cycle budget direction not indicated | Redo — add budget_direction from operator's q_budget_direction answer |

---

## Models

| Stage | Model |
|---|---|
| Plan | claude-sonnet-4-6 |
| Gather | claude-haiku-4-5-20251001 |
| Synthesize | claude-sonnet-4-6 |
| Write | claude-opus-4-7 |
| Review | claude-sonnet-4-6 |

The write stage uses `claude-opus-4-7` because the NextCycleBriefDraft is a
high-stakes planning document that drives the entire next cycle. Quality and
completeness are the priority.

---

## Prompt Cache Configuration

| Block | Cached | Contents |
|---|---|---|
| Block 1 | Yes | System role + profile context (operating_calendar, icp_archetypes, brand_voice) |
| Block 2 | Yes | Input artifacts: prior brief, measurement data, experiment review, competitive pulse, operator answers |
| Block 3 | No | Synthesis task, write task, self-review (dynamic per run) |

---

## SLA

| Constraint | Value |
|---|---|
| Max tokens | 28,000 |
| Max latency | 540 s (9 minutes) |
| Max cost | $3.00 USD |

---

## Operator Workflow

1. Confirm all required inputs are present and `phase5.executive_brief.output`
   is in **approved** (CMO sign-off) state.
2. Answer the 5 questions in `questions.yaml`. The QuestionManager will prompt
   for missing answers; `reusable_key` answers already in the ConversationStore
   are pre-filled.
3. Run the agent: `gtm run phase5.iteration_planner --tenant <id> --cycle <id>`
4. Review the NextCycleBriefDraft and self-review score in the output.
5. Route for CMO and CEO approval via `/gtm-approve`.
6. Upon dual approval, the system writes the artifact to:
   `tenants/<id>/cycles/<cycle_id>/next_cycle_brief_draft.json`
   and sets `next_cycle_seed_ready: true` in the frontmatter.
7. Start the next cycle:
   `gtm cycle-start --tenant <id> --seed-from <cycle_id>`
   The system loads the approved NextCycleBriefDraft as the seed for
   `phase1.brief_intake`, closing the feedback loop.

---

## Downstream

| Agent | Relationship |
|---|---|
| `phase1.brief_intake` (next cycle) | Primary downstream — consumes the approved NextCycleBriefDraft as its seed input |

---

## Files in This Directory

| File | Purpose |
|---|---|
| `agent_spec.yaml` | Full agent specification: inputs, output schema, approval gate, KPIs, SLA, models, cache |
| `questions.yaml` | Operator question definitions (5 questions; 3 required, 2 optional) |
| `rubric.yaml` | Self-review rubric applied by the review stage before CMO/CEO submission |
| `prompt.md` | Jinja2-templated prompt — zero brand literals; all values resolved at render time |
| `README.md` | This file |

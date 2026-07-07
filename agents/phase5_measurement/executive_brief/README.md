# phase5.executive_brief

**Phase:** 5 — Measurement & Optimization
**Stage:** 3 of 3
**Slug:** `phase5.executive_brief`

---

## Purpose

`phase5.executive_brief` is the final mandatory gate before Phase 5 exits. It produces
a board/CMO/CEO-ready performance brief — narrative, numbers, and asks — calibrated to
the seniority of the declared audience. Output is markdown source suitable for direct
rendering to PDF or PPTX via downstream skills.

This agent closes the performance loop: every original campaign objective from
`phase1.brief_intake` must appear in the brief's Objective vs. Actuals table,
and every ask must carry an owner and a decision deadline. No exceptions.

---

## Position in the Phase 5 Sequence

```
phase5.measurement          ← KPI actuals populated and approved
        ↓
phase5.experiment_review    ← Optional; experiment winners surfaced if present
        ↓
phase5.executive_brief      ← YOU ARE HERE (Phase 5 exit gate)
        ↓
phase5.iteration_planner    ← Downstream; receives this brief as context
```

**CMO approval is required on the output of this agent before it is delivered to
any C-suite or board audience.** The `phase_exit_gate` approval policy enforces this.

---

## Inputs

| Input key | Schema | Required | Notes |
|-----------|--------|----------|-------|
| `phase5.measurement.output` | `KPIFramework:v1.0.0` | Yes (approved) | All performance claims must trace here |
| `phase5.experiment_review.output` | `ExperimentReviewReport:v1.0.0` | No | When present, adds Experiment Winners section |
| `phase4.campaign_calendar.output` | `CampaignCalendar:v1` | Yes | Anchors cycle timeline and campaign scope |
| `phase1.brief_intake.output` | `BriefIntake:v1` | Yes | Original objectives for comparison table |

---

## Questions Collected Before Run

| Question key | Type | Required | Default |
|---|---|---|---|
| `q_audience_seniority` | select | Yes | — |
| `q_format` | select | Yes | — |
| `q_length_cap` | integer | No | 800 words |
| `q_off_limits_topics` | text | No | — |
| `q_asks_needed` | text | Yes | — |

Answers are injected into the prompt as `inputs.answers.*` and stored for reuse
under the `cycle.brief.*` reusable key namespace.

---

## Output

**Schema:** `ExecutiveBrief:v1.0.0`
**Format:** Markdown with YAML frontmatter

The brief is structured in seven sections:

1. Headline (one sentence — the most important thing that happened)
2. Objective vs. Actuals table
3. What Worked (top 3 wins with data citations)
4. What Didn't / What We Learned (top 2–3 honest insights)
5. Experiment Winners (only when experiment_review input is present)
6. Asks & Decisions Needed (owner + deadline per ask)
7. Next Cycle Preview (forward-looking teaser for iteration_planner)

---

## Quality Gates

The agent self-reviews against five rubric dimensions before returning output.
A weighted score below **0.75** triggers an automatic rewrite.

| Dimension | Weight |
|---|---|
| Executive readability | 0.25 |
| Objective traceability | 0.30 |
| Asks clarity | 0.25 |
| Data grounding | 0.15 |
| Length discipline | 0.05 |

Failure modes that trigger a redo:

- `missing_asks` — no asks section or empty asks
- `objective_gap_missing` — any brief_intake objective absent from the table
- `word_count_over` — body exceeds `q_length_cap`
- `brand_voice_fail` — reviewer score < 0.75

---

## Models

| Role | Model |
|---|---|
| Plan | claude-sonnet-4-6 |
| Gather | claude-haiku-4-5-20251001 |
| Synthesize | claude-sonnet-4-6 |
| Write | claude-opus-4-7 |
| Review | claude-sonnet-4-6 |

Prompt caching is active on blocks 1 and 2 (static instruction + profile/schema context).
Block 3 (live KPI actuals) is not cached — it changes every run.

---

## SLA

| Parameter | Limit |
|---|---|
| Max tokens | 32,000 |
| Max latency | 600 s |
| Max cost | $4.00 USD |

---

## Approval Policies

| Policy | Trigger |
|---|---|
| `brand_impacting` | Any output that carries the brand voice externally |
| `phase_exit_gate` | CMO must approve before C-suite or board delivery |

---

## Files in This Directory

| File | Purpose |
|---|---|
| `agent_spec.yaml` | Full agent contract: inputs, output, models, SLA, failure modes |
| `questions.yaml` | Pre-run questions collected from the user |
| `rubric.yaml` | Self-review rubric with scoring guide per dimension |
| `prompt.md` | Jinja2-templated prompt — zero brand literals |
| `README.md` | This file |

---

## Downstream

After CMO approval, output feeds directly into:

- **`phase5.iteration_planner`** — uses the executive brief as strategic context when
  planning the next campaign cycle's adjustments.

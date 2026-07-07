# Agent: phase5.experiment_review

**Phase:** 5  **Stage:** 2 of N  
**Inputs:** kpi_framework (approved), experiments directory (optional), campaign_calendar (optional)  
**Output:** ExperimentReviewReport (markdown + embedded JSON)  
**Optional:** `true` in cycle.yaml — no experiments = empty report, not a blocker

## Mission

Review all experiments that ran or concluded during the cycle. Apply rigorous
statistical standards to declare winners only when evidence is sufficient.
Produce rollout proposals for winning variants and document learnings that feed
directly into the next cycle's experiment design and asset decisions.

## Distinctive features

- **Underpowered-safe.** Experiments with impressions below `sample_size_target`
  are flagged `[UNDERPOWERED]` and never awarded a winner — directional signal
  is noted but not acted upon.
- **MDE gate.** A statistically significant result below the minimum detectable
  effect (`q_mde_pct`) is classified as `no_significant_difference` — the bar
  is lift + confidence, not confidence alone.
- **Empty-cycle graceful exit.** When no experiment files exist in the cycle
  directory, the agent produces an empty report with a single note and exits
  cleanly without blocking downstream phase exit.
- **Rollout approval auto-flagging.** Any rollout touching >20% of traffic or
  the primary acquisition channel is automatically flagged `requires_approval:
  true` and routed to the `brand_impacting` policy gate.
- **Aggregate learnings.** Beyond per-experiment findings, the agent synthesizes
  cross-experiment patterns to surface structural insights for the next cycle.

## Distinctive questions

- Significance threshold (default 0.95).
- Minimum detectable effect as % relative lift (default 5%).
- Rollout strategy: full immediate, phased 25%→100%, or manual approval per winner.
- Force-conclude running experiments at cycle end (default true).

## Cycle.yaml note

This agent is registered as `optional: true`. When a cycle ran zero experiments,
the agent produces an `ExperimentReviewReport` with `experiments_reviewed: 0`
and `empty_cycle_note: "No experiments ran this cycle"`. This is not an error —
the phase exit gate treats an empty report as passing for this agent.

## Output

| Field | Consumed by |
|---|---|
| `findings[].rollout_action` | Engineering / channel ops for variant deployment |
| `findings[].learning.summary` | phase1.brief_intake of next cycle (feeds hypothesis backlog) |
| `aggregate_learnings[]` | CMO review; informs next cycle channel and message strategy |
| `experiments_reviewed` | Cycle retrospective metrics |

## Approval gate

`brand_impacting` — triggered when any `rollout_action.requires_approval` is
`true` (i.e., rollout affects >20% of traffic or targets the primary channel).

## KPIs

| KPI | Target |
|---|---|
| experiments_reviewed | All in cycle |
| winner_declared_rate | >50% of powered experiments |
| learnings_documented | 100% |
| rollout_proposals_filed | 100% of winners |

## Failure modes

| Mode | Trigger | Resolution |
|---|---|---|
| `underpowered_conclusion` | impressions < sample_size_target | Flag [UNDERPOWERED], no winner, still learn |
| `no_source_data` | Zero experiment files in cycle | Empty report — not a blocker |
| `missing_learning` | Any finding lacks ≥30-word summary | Redo |

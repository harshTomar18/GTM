---
name: gtm-cycle-start
description: Use this skill to start a new GTM cycle for a tenant — either as a dry-run (compile DAG only, no agent execution) or a real run that walks the 27-stage workflow. Triggered by "start a cycle", "kick off the cycle for <tenant>", or "run /gtm-cycle-start". Also handles cycle resumption.
---

# Skill: gtm-cycle-start

## What it does

Loads `workflows/cycle.yaml`, compiles the 27-agent DAG, then either:
- **Dry-run mode:** prints the compiled execution order, approval gates, and phase boundaries; writes nothing.
- **Real run mode:** initializes `tenants/<id>/cycles/<cycle_id>/` and executes agents batch by batch, pausing at approval gates.

## Required inputs

| Field | Source |
|---|---|
| `tenant_id` | User |
| `cycle_id` | User (free-form, e.g. `2026-Q3` or `2026-08`) |
| `dry_run` | User; default `true` until the user explicitly says "execute" |
| `cycle_objective` | Optional but strongly recommended — anchors all downstream agents |

## Steps

1. **Validate tenant** via `gtm-validate-profile`. Refuse to start if invalid.
2. **Load cycle spec** from `workflows/cycle.yaml`. Parse phases + agents + depends_on + parallel_group + exit_gate.
3. **Compile DAG** using topological sort:
   - For each batch, pick all agents whose `depends_on` are already in the `seen` set.
   - Keep batches phase-pure (don't mix agents from different phases in one batch) so exit gates can fire between phases.
4. **If `dry_run=true`:** render the diagram (per `docs/DATA_FLOW.md` conventions) and stop. Do NOT write any cycle state.
5. **If `dry_run=false`:**
   - Create `tenants/<tenant_id>/cycles/<cycle_id>/` if it doesn't exist.
   - Write `tenants/<tenant_id>/cycles/<cycle_id>/cycle_state.yaml`:
     ```yaml
     cycle_id: <cycle_id>
     tenant_id: <tenant_id>
     status: running
     started_at: <iso>
     cycle_yaml_sha: <sha16>
     objective: <cycle_objective if provided>
     ```
   - For each batch in execution order:
     - Mark batch start in `audit_log.jsonl` (event: `cycle.advance_batch`).
     - Invoke each agent via `gtm-agent-run` skill (in parallel if the user OK'd that).
     - After the batch completes, if this is the last batch of a phase that has an `exit_gate`, invoke `gtm-policy-match` to enqueue a phase-exit approval. **Pause and surface to the user** — do not proceed to the next phase until approval is recorded.
6. **On completion:** update `cycle_state.yaml` `status: completed`, `completed_at`. Append `cycle.complete` audit event.

## Resumption

If `cycle_state.yaml` already exists with `status: running`, treat this as a resume:
- Reload it.
- Find the last completed agent run via `tenants/<id>/cycles/<id>/runs/*.json`.
- Continue from the next batch.

## Output format

```
═══ Cycle <cycle_id> for tenant <tenant_id> ═══
Mode: DRY-RUN | LIVE
[diagram of phases + agents + gates]

[per-agent execution log if LIVE]
```

## Do NOT

- Don't execute agents in parallel without explicit user OK (default to serial).
- Don't bypass an exit gate even if the user begs — gates are the system's safety primitive.
- Don't run if `gtm-validate-profile` fails.
- Don't write outside `tenants/<tenant_id>/cycles/<cycle_id>/`.

## Workstream A note

Until agents in Workstreams B/C/D exist, agent invocation will fall through to the
`gtm-agent-run` skill's "stub" path, which writes a placeholder artifact and an
audit record. The DAG, gates, and approval flow still exercise correctly.

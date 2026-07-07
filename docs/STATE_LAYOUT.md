# State Layout — How Data Persists Without a Database

The Universal GTM OS has no SQLite, no Postgres, no in-memory daemon. Every piece of
state lives on disk as a YAML/JSON/Markdown file under a deterministic path. The
filesystem **is** the database. Claude (the runtime) reads and writes these files
during skill invocations.

This document is the single source of truth for filesystem layout, file formats,
and access patterns. If a skill or agent prompt deviates from this layout, the
deviation is a bug.

---

## Top-level structure

```
Universal-GTM-OS/
├── .claude/                       # skills + slash commands (Claude Code config)
│   ├── skills/<skill_name>/SKILL.md
│   └── commands/<cmd>.md
├── schemas/                       # JSON Schema files (read-only contracts)
│   ├── tenant_profile.schema.json
│   ├── handoff.schema.json
│   ├── policies.schema.json
│   ├── agent_spec.schema.json
│   ├── question_set.schema.json
│   └── artifacts/*.schema.json
├── prompts/_shared/               # universal prompt fragments (Jinja-style)
├── vertical_packs/<pack_id>/      # industry packs
├── tenants/<tenant_id>/           # per-tenant state (see below)
├── governance/
│   ├── approval_policies.yaml     # the policy set
│   ├── policies.md                # human-readable policy reference
│   └── audit_log.jsonl            # append-only audit log (shared across tenants)
├── workflows/
│   └── cycle.yaml                 # the 27-stage DAG
├── agents/<phase>/<slug>/         # agent prompts + question sets (Workstream B+)
├── docs/                          # this directory
└── _python_reference/             # archived Python implementation (not active)
```

---

## Per-tenant layout (the 4-tier memory model on disk)

Every tenant has the exact same internal structure:

```
tenants/<tenant_id>/
├── tenant_profile.yaml            # T1 — tenant identity, ICP, brand voice, etc.
├── baseline/                      # T1 — long-lived markdown context
│   ├── README.md
│   ├── brand_voice_examples.md
│   ├── messaging_master.md        # (rendered by phase2.narrative_lock)
│   ├── icp_personas.md
│   ├── competitor_profiles.md
│   ├── proof_point_library.md
│   ├── claim_library.md
│   └── banned_claims.md
├── answers/                       # T1-promoted answers (reusable across cycles)
│   └── <reusable_key>.json
├── cycles/<cycle_id>/             # T2 — one folder per cycle
│   ├── cycle_state.yaml           # status, started_at, completed_at, objective
│   ├── context_bus/               # typed artifacts produced by agents
│   │   ├── <agent_slug>.output.json
│   │   └── …
│   ├── handoffs/<handoff_id>.json # Handoff envelopes (one per artifact publish)
│   ├── runs/<run_id>.json         # one per agent run (status, cost, tokens, latency)
│   ├── agent_questions/           # T4 promoted to T2 (cycle-scoped reuse)
│   │   └── <agent_slug>/<question_id>.json
│   ├── answers/                   # T2 reusable answers (cycle-scoped)
│   │   └── <reusable_key>.json
│   ├── agent_consumptions/        # staleness markers
│   │   └── <consumer_slug>/<input_key>.json
│   └── approvals/<approval_id>.json
└── signals/                       # Workstream D — incoming signal feed
    └── <signal_id>.json
```

T3 (single-run) state lives in-memory inside one Claude turn; it does not persist.

---

## File-format conventions

| File | Format | Schema |
|---|---|---|
| `tenant_profile.yaml` | YAML | `schemas/tenant_profile.schema.json` |
| `cycle_state.yaml` | YAML | (see below) |
| `context_bus/<slug>.output.json` | JSON | `schemas/artifacts/<name>.schema.json` (per artifact) |
| `handoffs/<id>.json` | JSON | `schemas/handoff.schema.json` |
| `runs/<id>.json` | JSON | (see below) |
| `approvals/<id>.json` | JSON | `schemas/artifacts/approval_record.schema.json` |
| `answers/<key>.json` | JSON | `{value, type, promoted_from, promoted_at, source_agent}` |
| `agent_questions/<slug>/<qid>.json` | JSON | `{answer_id, question_id, answer_value, type, source, reusable_key, answered_at}` |
| `audit_log.jsonl` | JSONL | (see below) |
| `signals/<id>.json` | JSON | (Workstream D) |

### `cycle_state.yaml`

```yaml
cycle_id: 2026-Q3
tenant_id: acme
status: running          # draft | running | paused | completed | aborted
started_at: 2026-07-01T09:00:00Z
completed_at: null
cycle_yaml_sha: ab12cd34
objective: "Land 5 healthcare-provider ICPs in ABM tier"
current_phase: phase1_research
current_batch: 2
batches_completed: [1]
exit_gates_pending: []
```

### `runs/<run_id>.json`

```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "acme",
  "cycle_id": "2026-Q3",
  "agent_slug": "phase1.brief_intake",
  "status": "completed",
  "started_at": "2026-07-01T09:15:00Z",
  "completed_at": "2026-07-01T09:23:11Z",
  "prompt_sha": "8f2a1d3c4b5e6f7a",
  "model_used": "claude-opus-4-7",
  "tokens_in": 12450,
  "tokens_out": 3120,
  "cache_read_tokens": 8900,
  "cache_write_tokens": 0,
  "cost_usd": 0.2842,
  "latency_ms": 8123,
  "retry_count": 0,
  "artifact_ref": "phase1.brief_intake.output",
  "approval_id": "a1b2c3d4-...",
  "error_message": null
}
```

### Artifact envelope (every `context_bus/*.json`)

Every artifact file uses this outer shape:

```json
{
  "schema_version": "BriefIntake:v1.0.0",
  "artifact_version": "1.0.0",
  "tenant_id": "acme",
  "cycle_id": "2026-Q3",
  "written_by_agent": "phase1.brief_intake",
  "written_at": "2026-07-01T09:23:11Z",
  "approved_at": null,
  "approval_record_id": null,
  "quality_signals": {
    "self_review_score": 0.86,
    "citation_count": 14,
    "unknown_count": 0,
    "brand_validator_pass": true,
    "claim_checker_pass": true,
    "regulatory_lint_pass": true,
    "pii_scan_pass": true,
    "word_count": 1840
  },
  "payload": { /* artifact-schema-conformant body */ }
}
```

The `payload` itself must validate against the named artifact schema.

### Versioning artifacts

When an artifact is rewritten (e.g. after rejection + redo), the existing file is
renamed to `<key>.v<prev>.json` before the new version is written. The latest is
always at `<key>.output.json`. Example:

```
context_bus/
  phase2.positioning.output.json     # current (v1.2.0)
  phase2.positioning.output.v1.1.0.json
  phase2.positioning.output.v1.0.0.json
```

---

## Audit log

`governance/audit_log.jsonl` is **append-only**. Every state-changing operation writes
one line.

### Event catalog

| Event | Subject | Emitted by |
|---|---|---|
| `tenant.initialized` | tenant | gtm-tenant-init |
| `tenant.profile_updated` | tenant | (Workstream B) |
| `cycle.start` | cycle | gtm-cycle-start |
| `cycle.advance_phase` | cycle | gtm-cycle-start |
| `cycle.advance_batch` | cycle | gtm-cycle-start |
| `cycle.complete` | cycle | gtm-cycle-start |
| `cycle.abort` | cycle | (any) |
| `agent.run.start` | run | gtm-agent-run |
| `agent.run.complete` | run | gtm-agent-run |
| `agent.run.failed` | run | gtm-agent-run |
| `agent.stub_run` | run | gtm-agent-run (Workstream A) |
| `agent.question.asked` | run | gtm-agent-run |
| `agent.question.answered` | run | gtm-question-manager |
| `context_bus.put` | artifact | gtm-context-bus |
| `context_bus.miss` | artifact | gtm-context-bus |
| `artifact.published` | artifact | gtm-agent-run |
| `artifact.version_bumped` | artifact | gtm-agent-run |
| `artifact.deprecated` | artifact | (manual) |
| `handoff.written` | handoff | gtm-handoff-validate |
| `approval.requested` | approval | gtm-policy-match |
| `approval.decision` | approval | gtm-approve / gtm-reject |
| `approval.escalated` | approval | gtm-reject (max iter exceeded) |
| `policy.matched` | artifact | gtm-policy-match |
| `signal.received` | signal | (Workstream D) |
| `signal.acted_upon` | signal | (Workstream D) |
| `experiment.created` / `assigned` / `concluded` | experiment | (Workstream D) |
| `attribution.event_logged` | event | (Workstream D) |
| `prompt.version_bumped` | prompt | (manual) |

### Record shape

```json
{
  "ts": "2026-07-01T09:23:11.123Z",
  "event": "approval.decision",
  "actor": "Jane Doe",
  "actor_role": "CMO",
  "subject_type": "approval",
  "subject_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tenant_id": "acme",
  "cycle_id": "2026-Q3",
  "policies_matched": ["brand_impacting"],
  "rationale": "Hero feels generic. Sharpen to vertical.",
  "before": { "decision": "pending" },
  "after": { "decision": "rejected" }
}
```

### Append-only discipline

- Never edit a prior line.
- Never delete the file.
- Rotation is by symlink: `audit_log.jsonl` → `audit_log.2026.jsonl` once per year.
- Hash chain (Workstream D): each record gets a `prev_hash` field.

---

## Concurrency

Single-user, single-process design. There is no lock manager. If two slash commands
run simultaneously and touch the same file, last-write-wins. The realistic risk is
near-zero in practice because Claude Code runs operations sequentially within a
session.

If multi-user is ever needed, introduce a `flock`-style sentinel file
(`tenants/<id>/.lock`) at the tenant or cycle level and have skills acquire it before
writes. Defer until needed.

---

## Backups

The whole `Universal-GTM-OS/` directory is a Git repo. Backups happen by committing.
Three rules:

1. Commit `tenants/<id>/cycles/` regularly — these are the only files that change
   often and represent real work.
2. Don't commit `audit_log.jsonl` mid-cycle — it churns too fast; commit at cycle
   boundaries.
3. Tag every approved cycle: `git tag <tenant>-<cycle>-completed`.

---

## Path API summary

If you're writing a skill, these are the only paths you should reference:

| Purpose | Path template |
|---|---|
| Tenant profile | `tenants/<tid>/tenant_profile.yaml` |
| T1 reusable answer | `tenants/<tid>/answers/<key>.json` |
| Cycle state | `tenants/<tid>/cycles/<cid>/cycle_state.yaml` |
| Artifact (latest) | `tenants/<tid>/cycles/<cid>/context_bus/<key>.json` |
| Artifact (prior version) | `tenants/<tid>/cycles/<cid>/context_bus/<key>.v<ver>.json` |
| Handoff | `tenants/<tid>/cycles/<cid>/handoffs/<hid>.json` |
| Run | `tenants/<tid>/cycles/<cid>/runs/<rid>.json` |
| Approval | `tenants/<tid>/cycles/<cid>/approvals/<aid>.json` |
| T2 reusable answer | `tenants/<tid>/cycles/<cid>/answers/<key>.json` |
| Per-agent question answer | `tenants/<tid>/cycles/<cid>/agent_questions/<slug>/<qid>.json` |
| Consumption marker | `tenants/<tid>/cycles/<cid>/agent_consumptions/<consumer>/<input_key>.json` |
| Audit log | `governance/audit_log.jsonl` |

Anything else is a sign the skill is doing something wrong.

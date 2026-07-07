# Universal AI GTM Operating System

A Claude-Code-native, industry/LOB/motion-agnostic multi-agent platform that runs
the 27-stage GTM playbook (Research → Narrative → Assets → Distribution →
Measurement) with typed contracts, policy-driven approvals, and zero installation.

> **Workstream A status:** complete. The framework — schemas, governance, DAG,
> skills, slash commands, docs — is in place. Real Phase 1-5 agents land in
> Workstreams B, C, and D.

---

## Two-sentence summary

There is no server, no database, no Python interpreter. Claude Code itself is the
runtime — you type slash commands, skills read and write files under `tenants/<id>/`,
the system asks you questions when context is missing and pauses for human approval
at every meaningful artifact.

---

## Quick start (5 minutes)

```
# in this folder, open Claude Code, then in chat:
/gtm-help
/gtm-validate-profile _example
/gtm-cycle-start tenant=_example cycle=2026-Q3   # dry-run; prints the 27-agent DAG
```

For the full walkthrough see [`docs/QUICKSTART.md`](docs/QUICKSTART.md).

---

## What's in this folder

| Path | What it is |
|---|---|
| `.claude/skills/` | 13 Claude Code skills (the operational logic) |
| `.claude/commands/` | 9 slash commands (user-facing entry points) |
| `schemas/` | 18 JSON Schema files defining the typed contracts |
| `prompts/_shared/` | Universal Jinja-templated prompt fragments |
| `workflows/cycle.yaml` | The 27-stage agent DAG |
| `governance/approval_policies.yaml` | Policy-driven approval rules |
| `governance/audit_log.jsonl` | Append-only system audit log |
| `vertical_packs/_template/` | Empty starter pack — copy when onboarding a new vertical |
| `tenants/_example/` | Example tenant (fictional Acme finance ops SaaS) |
| `agents/` | Per-agent prompts + question sets (Workstream B+) |
| `shared_services/` | Brand validator, claim checker, signal bus, attribution, … (Workstream D) |
| `docs/` | Architecture, How-it-works, Data flow, State layout, Workstreams |
| `_python_reference/` | Archived Python implementation; not used by the active system |

---

## The 8 cardinal rules

1. **No brand strings in prompts.** Identity is resolved from `tenant_profile.yaml`
   at render time. Universal prompts stay universal.
2. **No skill reads outside its tenant's directory.** Tenant isolation is path-based.
3. **No agent runs without approved upstream handoffs.** Unless `entrypoint: true`.
4. **No artifact reaches a human approver without passing automated validation.**
   Brand, claim, regulatory, PII checks first.
5. **Prompts are versioned. Models are pinned.** See `prompts/_registry.yaml`.
6. **Every state-changing operation appends to `audit_log.jsonl`.** No silent state.
7. **Reject without a comment is forbidden.** The comment is the redo brief.
8. **Approval gates are policy-driven, not phase-coupled.** A spend-heavy artifact
   in week 2 still hits the CFO.

---

## Slash commands at a glance

| Command | Purpose |
|---|---|
| `/gtm-tenant-init` | Scaffold a new tenant by cloning the example |
| `/gtm-validate-profile` | Validate a tenant_profile.yaml against the schema |
| `/gtm-cycle-start` | Start (dry-run by default) or execute a cycle |
| `/gtm-agent-run` | Run a single agent within a cycle |
| `/gtm-pending` | List pending approval requests |
| `/gtm-approve` | Approve a pending request |
| `/gtm-reject` | Reject (with required comment) or request revisions |
| `/gtm-dashboard` | Tenant status: cycles, runs, approvals, audit events |
| `/gtm-help` | Show this list inline |

---

## Architectural choices, summarized

| Concern | Resolution |
|---|---|
| Tenant identity | `tenants/<id>/tenant_profile.yaml` + `vertical_packs/<id>/profile_defaults.yaml` (deep-merged) |
| Agent execution | Claude Code skill `gtm-agent-run` walks 5 stages: Plan → Gather → Synthesize → Write → Self-Review |
| Inter-agent contracts | Typed `Handoff` envelopes with `schema_version` major-version checks |
| Memory (4 tiers) | T1 baseline (`tenants/<id>/baseline/`), T2 cycle (`cycles/<id>/`), T3 in-memory, T4 conversation answers |
| Approval workflow | Artifact attributes match `approval_policies.yaml`; multi-role gates persist as `approvals/<id>.json` |
| Question reuse | Per-question `reusable_key`s promote answers across agents — user is never asked the same thing twice |
| Cycle DAG | `workflows/cycle.yaml` with explicit `depends_on` + `parallel_group` + phase `exit_gate` |
| Audit | Append-only `governance/audit_log.jsonl`, indexed by `subject_id` |

---

## Where to read next

- **Operators:** [`docs/QUICKSTART.md`](docs/QUICKSTART.md) then [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md).
- **Architects:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) then [`docs/DATA_FLOW.md`](docs/DATA_FLOW.md).
- **Implementers (Workstreams B/C/D):** [`docs/WORKSTREAMS.md`](docs/WORKSTREAMS.md) then [`docs/STATE_LAYOUT.md`](docs/STATE_LAYOUT.md).
- **Pack builders:** [`docs/ADDING_A_VERTICAL_PACK.md`](docs/ADDING_A_VERTICAL_PACK.md).
- **Original spec:** the enterprise blueprint at `~/.claude/plans/c-users-17168-downloads-gtm-blueprint-1-fizzy-sparrow.md`.

---

## Relationship to the legacy cyber instance

The existing Compunnel cyber GTM agents at `../GTM Agent Folder P1 n P2/` are
**untouched**. They remain the production system for Compunnel Cybersecurity
marketing work. This Universal GTM OS is a parallel implementation that starts
fresh, has no shared code or content with the cyber instance, and is intended for
new tenants across new verticals (SaaS, Healthcare, BFSI, Manufacturing,
Government, and yes, eventually a fresh `cyber_b2b_enterprise` pack — but built
without migrating from the legacy folder).

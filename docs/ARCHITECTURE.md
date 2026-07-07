# Architecture — Universal GTM OS (Claude-Code-Native)

This is the system view. For day-to-day operation see `HOW_IT_WORKS.md`. For file
layout see `STATE_LAYOUT.md`. For the enterprise blueprint that informed every
decision here, see `~/.claude/plans/c-users-17168-downloads-gtm-blueprint-1-fizzy-sparrow.md`.

---

## Design tenets (carried over from the blueprint)

1. **Identity lives in config, not prompts.** Brand, ICP, frameworks, vocabulary are
   resolved from `tenant_profile.yaml` at runtime. Prompts are universal.
2. **Every agent is a five-stage pipeline.** Plan → Gather → Synthesize → Write → Self-Review.
3. **Missing context becomes a question.** The MVC gate asks rather than assumes.
4. **Approval gates are policy-driven.** Artifact attributes match policies.
5. **Handoffs are typed envelopes.** Receivers refuse stale or schema-mismatched upstream.
6. **Reactive on top of scheduled.** A DAG is the spine; events inject reactive work.
7. **Governance and evals are first-class.** Brand, claim, regulatory, PII checks run
   before any human reviews.

The Claude-Code-native architecture preserves all seven tenets — the only thing that
changes is **how** they're implemented. Where the blueprint envisioned Python classes
calling each other, we now have skill prompts that file-read, file-write, and ask the
user questions through the Claude Code conversation interface.

---

## Layer diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                                  │
│   Claude Code chat  +  slash commands  +  AskUserQuestion              │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                    SLASH COMMAND LAYER (entry points)                   │
│   /gtm-tenant-init  /gtm-cycle-start  /gtm-agent-run  /gtm-approve …    │
│   .claude/commands/*.md                                                 │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                         SKILL LAYER (logic)                             │
│   gtm-tenant-init   gtm-validate-profile   gtm-cycle-start              │
│   gtm-agent-run     gtm-context-bus        gtm-question-manager         │
│   gtm-policy-match  gtm-handoff-validate                                │
│   gtm-approve       gtm-reject             gtm-pending                  │
│   gtm-dashboard                                                         │
│   .claude/skills/<name>/SKILL.md                                        │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                         AGENT LAYER (Workstream B+)                     │
│   27 agents across 5 phases. Each agent is a folder under agents/.      │
│   agents/<phase>/<slug>/{prompt.md, questions.yaml, agent_spec.yaml,    │
│                          rubric.yaml}                                    │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                     SHARED SERVICES (Workstream D)                      │
│   Signal Bus  •  Experimentation  •  Attribution  •  Localization       │
│   Brand Validator  •  Claim Checker  •  Regulatory Lint  •  PII Scanner │
│   shared_services/<service>/SKILL.md (Workstream D)                     │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE LAYER (the filesystem)                │
│   tenants/<id>/                                                         │
│   ├── tenant_profile.yaml          (T1 tenant memory)                   │
│   ├── baseline/                    (T1 long-lived markdown)             │
│   ├── answers/                     (T1 reusable answers)                │
│   ├── cycles/<id>/                 (T2 cycle scope)                     │
│   │   ├── cycle_state.yaml                                              │
│   │   ├── context_bus/             (artifact storage)                   │
│   │   ├── handoffs/                                                     │
│   │   ├── runs/                                                         │
│   │   ├── approvals/                                                    │
│   │   ├── answers/                                                      │
│   │   └── agent_questions/                                              │
│   └── signals/                     (Workstream D)                       │
│   governance/audit_log.jsonl       (append-only, system-wide)           │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTRACT LAYER (schemas)                             │
│   schemas/{tenant_profile, handoff, policies, agent_spec, question_set} │
│   schemas/artifacts/{13 artifact schemas}                               │
│   All JSON Schema draft 2020-12.                                        │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                  CONFIGURATION LAYER                                    │
│   workflows/cycle.yaml             (the 27-stage DAG)                   │
│   governance/approval_policies.yaml                                     │
│   vertical_packs/<pack>/profile_defaults.yaml                           │
│   prompts/_shared/profile_header.md                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Runtime model

There is no daemon, no service, no API server. Claude Code is the runtime. A user
turn fires a slash command, the command invokes a skill, the skill reads/writes
files and (when needed) asks the user questions. Everything else is a file.

```
USER  ──/gtm-cycle-start tenant=acme cycle=2026-Q3──►  Claude Code
                                                          │
                                                          ▼
                                              .claude/commands/gtm-cycle-start.md
                                                          │
                                                          ▼
                                              Invokes skill: gtm-cycle-start
                                                          │
                                            ┌─────────────┼─────────────┐
                                            ▼             ▼             ▼
                                  validate profile   load cycle.yaml   compile DAG
                                            │             │             │
                                            └─────────────┴──────┬──────┘
                                                                 ▼
                                            For each batch in execution order:
                                              For each agent slug in batch:
                                                Invoke gtm-agent-run skill
                                                  │
                                                  ├── plan → gtm-question-manager (may AskUserQuestion)
                                                  ├── gather_context → gtm-context-bus.get(...)
                                                  ├── synthesize (LLM call, dry-run safe)
                                                  ├── write (LLM call)
                                                  ├── self_review
                                                  └── publish:
                                                       gtm-context-bus.put(...)
                                                       gtm-handoff-validate.emit(...)
                                                       gtm-policy-match → approval enqueued
                                              [phase exit gate] → PAUSE until approval lands
                                                                 (gtm-approve)
```

---

## Why "Claude as runtime" works

**Pros for this design:**

- Zero install. No `pip`, no `npm`, no Docker, no DB.
- The artifact production is itself an LLM job — pushing the orchestration into the
  same LLM call collapses what would otherwise be two boundaries (Python →
  Anthropic API) into one (Claude Code → Claude).
- Files are inspectable, diffable, grep-able, git-able. State is auditable by
  default; no schema migrations.
- The user can pause anywhere, edit anything by hand, and resume.

**Trade-offs we accept:**

- No machine-validated schema enforcement at the boundary — the skill prompts
  instruct Claude to validate, but a hostile or buggy edit can produce non-conforming
  artifacts. Mitigation: the receiving agent's plan stage does a structural check.
- Concurrency is sequential within one Claude Code session. Two parallel sessions
  on the same tenant would race. Mitigation: don't do that.
- Cost telemetry is approximate. Claude Code doesn't expose token counts per skill
  invocation in machine-readable form. Mitigation: record what we can in `runs/*.json`;
  rely on Anthropic console for billing truth.
- Eval automation is harder. We can't run a nightly golden-set regression without
  Python or a CI runner. Mitigation: Workstream D ships an evals-via-Claude-Code
  pattern.

---

## What lives where (decision matrix)

| Concern | Lives in | Why |
|---|---|---|
| Tenant identity | `tenants/<id>/tenant_profile.yaml` | One place per tenant; cleanly substitutable |
| Industry defaults | `vertical_packs/<id>/profile_defaults.yaml` | Reusable across tenants in the same vertical |
| Universal prompts | `prompts/_shared/*.md` | Brand-agnostic; CI lints for forbidden literals |
| Per-agent prompts | `agents/<phase>/<slug>/prompt.md` | Workstream B+; Jinja-templated against profile |
| Per-agent questions | `agents/<phase>/<slug>/questions.yaml` | MVC gate definition |
| The 27-stage DAG | `workflows/cycle.yaml` | One file. Single source of truth. |
| Approval policies | `governance/approval_policies.yaml` | Policy-driven, not phase-coupled |
| Skill logic | `.claude/skills/<name>/SKILL.md` | Claude Code finds these automatically |
| Slash entry points | `.claude/commands/<name>.md` | User-facing UX |
| Schemas | `schemas/*.schema.json` | JSON Schema draft 2020-12 |
| Audit | `governance/audit_log.jsonl` | Append-only, shared across tenants |
| Per-cycle state | `tenants/<id>/cycles/<cid>/*` | T2 memory tier |
| Reactive signals | `tenants/<id>/signals/` | Workstream D |

---

## Where the cyber legacy fits

`Generic GTM Agents/GTM Agent Folder P1 n P2/` (the Compunnel cyber instance) is
**untouched** and remains the production GTM engine for Compunnel cybersecurity work.
This Universal-GTM-OS folder is a parallel, ground-up implementation that the user
will populate with new tenants and packs over time. There is no migration path
planned — the cyber system is run by Python and stays that way.

---

## Pointer to the blueprint sections

| Blueprint section | Implementation here |
|---|---|
| §1 Config & Profile Layer | `schemas/tenant_profile.schema.json`, `vertical_packs/_template/` |
| §2 Agent Architecture | `.claude/skills/gtm-agent-run/SKILL.md`, `agents/` (Workstream B+) |
| §3 Memory Architecture | `STATE_LAYOUT.md` 4-tier model, ContextBus skill |
| §4 Human Approval Architecture | `governance/approval_policies.yaml`, `gtm-approve` / `gtm-reject` skills |
| §5 Multi-Agent Collaboration | `gtm-handoff-validate` skill, `schemas/handoff.schema.json` |
| §6 Universal Schemas | `schemas/artifacts/*.schema.json` |
| §7 Phase 3/4 Agent Specs | `agents/phase3_*` / `agents/phase4_*` (Workstream C) |
| §8 Enterprise Layer | `shared_services/` (Workstream D) |
| §9 Governance & Observability | `audit_log.jsonl`, evals + prompt registry (Workstream D) |
| §10 Tech Stack | Replaced — Claude Code IS the stack |
| §11 Migration Path | See `WORKSTREAMS.md` |
| §12 Risks & Weaknesses | Captured in QUICKSTART troubleshooting |

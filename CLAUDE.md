# CLAUDE.md — Universal GTM OS

Conventions Claude Code must follow when working inside this folder.

## Project Identity

This is a **brand-agnostic, vertical-agnostic, motion-agnostic** AI GTM platform.
The only places where brand/industry/motion specifics may appear:

- `tenants/<id>/tenant_profile.yaml` — per-tenant config
- `tenants/<id>/baseline/` — per-tenant long-lived markdown
- `tenants/<id>/cycles/` — per-tenant cycle outputs
- `vertical_packs/<id>/` — packaged industry defaults

Every other file — `schemas/`, `prompts/_shared/`, `workflows/`, `.claude/`,
`docs/` — must stay universal. No "Compunnel", no "Acme", no "NIST", no "HIPAA"
literals outside the locations above.

## Runtime

There is no Python interpreter, no database server, no daemon. **Claude Code is
the runtime.** Slash commands invoke skills; skills read/write files; the user
answers questions in chat when prompted.

If a tool you're about to call requires Python or any uninstalled binary, STOP
and ask the user — the system is built to work without those by design.

## Cardinal Rules

1. **No brand strings in prompts.** Prompts use Jinja `{{ profile.* }}` references.
2. **No skill reads outside its tenant's directory.** Tenant isolation is path-based.
3. **No agent runs without approved upstream handoffs** unless `entrypoint: true`.
4. **No artifact reaches a human approver without passing automated validation.**
   Brand validator + claim checker + regulatory lint + PII scan first.
5. **Prompts are versioned. Models are pinned.** Check `prompts/_registry.yaml`
   before running an agent.
6. **Every state-changing operation appends to `governance/audit_log.jsonl`.**
7. **Reject without a comment is forbidden.** The comment IS the redo brief.
8. **Approval gates are policy-driven, not phase-coupled.** Match against
   `governance/approval_policies.yaml`.

## When Editing

### Adding an agent

Create `agents/<phase>/<slug>/` containing:
- `prompt.md` — Jinja-templated against `profile` and `inputs`
- `questions.yaml` — MVC gate question set (validates against
  `schemas/question_set.schema.json`)
- `agent_spec.yaml` — agent metadata (validates against
  `schemas/agent_spec.schema.json`)
- `rubric.yaml` — self-review scoring rubric (used in stage 5)
- `README.md` — mission, distinctive questions, KPIs, downstream collaborators

Then register the slug in `workflows/cycle.yaml` under the appropriate phase.

### Adding a schema

- Create `schemas/<name>.schema.json` (or `schemas/artifacts/<name>.schema.json`
  for an artifact).
- Use JSON Schema draft 2020-12 with `$schema` set accordingly.
- Include a `const` value for `schema_version` (e.g. `"const": "PersonaSpec:v1.0.0"`).
- Add a row in `schemas/README.md`.

### Adding an approval policy

Append to `governance/approval_policies.yaml`. The condition language is the
`PolicyMatchCondition` from `schemas/policies.schema.json`. Don't add hardcoded
approval logic to any skill — policies are data.

### Adding a vertical pack

Follow `docs/ADDING_A_VERTICAL_PACK.md` step by step. The pack template is at
`vertical_packs/_template/`.

### Adding a skill

Create `.claude/skills/<name>/SKILL.md`. The frontmatter must include:
- `name` — kebab-case, must match the directory name
- `description` — clear trigger phrases so Claude knows when to invoke

Inside the skill, document inputs, steps, output format, and explicit "Do NOT"
guardrails. Skills are prompts; clarity matters.

## Build Workstreams

- **A. Foundations** — current; framework plumbing
- **B. Phase 1 + 2 Agents** — Research + Narrative (10 agents)
- **C. Phase 3 + 4 Agents** — Asset Creation + Distribution (12 agents)
- **D. Phase 5 + Enterprise Layer** — Measurement + Signal Bus + Attribution +
  Brand Validator + Claim Checker + Regulatory Lint + PII Scanner + Localization

## Source of Truth

The enterprise blueprint:
`~/.claude/plans/c-users-17168-downloads-gtm-blueprint-1-fizzy-sparrow.md`

All design decisions trace back to it. If implementation needs to diverge, update
the blueprint first, then implement.

## What Claude Should NOT Do

- Don't install Python, pip, npm, or any package manager unless the user explicitly
  asks. The system is designed to run without them.
- Don't write code in `core/`, `tests/`, or `_python_reference/`. Those are
  archived; the active runtime is skills + slash commands.
- Don't mutate `_python_reference/` for any reason.
- Don't reach into the parent `Generic GTM Agents/GTM Agent Folder P1 n P2/` —
  that's a separate, untouched cybersecurity instance.
- Don't auto-approve any approval. Approval requires explicit `/gtm-approve` from
  the user.
- Don't bypass an exit gate. Phase exit gates are the system's safety primitive.
- Don't ask the user a question whose `reusable_key` already resolves — check
  T1/T2 first.

## Cyber Legacy Reminder

`../GTM Agent Folder P1 n P2/` is Compunnel's working cybersecurity GTM system. It
runs on Python and stays that way. We are explicitly NOT migrating from it. The
Universal-GTM-OS is a parallel system that may eventually receive a fresh
`vertical_packs/cyber_b2b_enterprise/` pack — built from scratch, not ported.

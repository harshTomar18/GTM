---
name: gtm-agent-run
description: Use this skill to run a single GTM agent within an active cycle — executing its 5-stage pipeline (plan, gather_context, synthesize, write, self_review) and publishing the output to the ContextBus. Triggered by "run agent <slug>" or invoked by gtm-cycle-start.
---

# Skill: gtm-agent-run

## What it does

Executes one agent's five-stage pipeline and publishes the typed artifact to
`tenants/<id>/cycles/<id>/context_bus/<key>.json` with a corresponding Handoff record.

## Required inputs

| Field | Source |
|---|---|
| `tenant_id` | User OR cycle context |
| `cycle_id` | User OR cycle context |
| `agent_slug` | User OR cycle DAG |

## Pre-flight: prompt registry enforcement

Before executing any stage, validate the agent is registered and pinned:

1. Load `prompts/_registry.yaml`.
2. Look up `agent_slug` under `agents:`.
   - Not found → **HARD FAIL**: "Agent `<slug>` is not registered in `prompts/_registry.yaml`. Add a pinned entry before running."
3. Read `<!-- prompt_version: X.Y.Z -->` header from the agent's `prompt.md`.
4. Compare to the registry `@X.Y.Z` suffix on the prompt path.
   - Mismatch → **HARD FAIL**: "Prompt version mismatch for `<slug>`: registry says `X.Y.Z` but file header says `A.B.C`. Update the registry entry."
5. Verify `model:` field in the registry entry is a fully-pinned model ID (not "latest" or any alias).
   - Alias detected → **HARD FAIL**: "Model must be pinned (e.g., `claude-opus-4-7`), not an alias."

This check is skipped when `dry_run=true`.

## Five stages

For each stage, follow the agent's `agents/<phase>/<slug>/prompt.md` instructions.
The base flow is:

### 1. plan
- Load `agents/<phase>/<slug>/agent_spec.yaml`.
- Check upstream dependencies in ContextBus (`tenants/<id>/cycles/<id>/context_bus/<key>.json`).
  For each `inputs[].key`:
  - Verify file exists.
  - Verify `schema_version` major matches `inputs[].schema_version` major.
  - Verify `approved_at` is set (unless `entrypoint: true`).
- Load `agents/<phase>/<slug>/questions.yaml`.
- For each question with `required_for: plan`:
  - If a prior answer exists under `tenants/<id>/answers/<reusable_key>.json`, reuse silently.
  - Else if `default` is set, use it.
  - Else add to the **missing** list.
- If missing list is non-empty → **STOP, AskUserQuestion** for the missing items, persist answers, retry.

### 2. gather_context
- Load every input artifact's payload from ContextBus.
- Load `profile_keys[]` values from `tenants/<id>/tenant_profile.yaml`.
- Collect external retrievals if the agent prompt requires them (web search, MCP calls).

### 3. synthesize
- Render the agent prompt via `gtm-render-prompt` (block 1 = tenant profile header; block 2 = cycle header; block 3 = agent prompt + inputs).
- Produce structured intermediate output. Validate top-level required fields.

### 4. write
- Produce the final markdown / structured artifact.
- Apply brand voice from `profile.brand_voice` (tone, banned phrases, reading level).
- Cite every external claim.

### 5. self_review
- Score against the agent's rubric in `agents/<phase>/<slug>/rubric.yaml` (if present).
- If score < 0.7 or banned phrases present → mark `auto_redo` with `redo_brief`.
- If pass → continue.

## Quality gate chain (Workstream D)

After self_review passes, run the four automated validators **in order** before
writing to ContextBus or routing to approval:

| Step | Skill | Pass condition | On FAIL |
|---|---|---|---|
| 1 | `gtm-brand-validator` | No banned phrases + tone ≥ fidelity_threshold | Auto-redo (max 3); inject `revision_brief` from validator output |
| 2 | `gtm-claim-checker` | No uncited numerics, frameworks, or comparatives | Auto-redo (max 3); inject `revision_brief` |
| 3 | `gtm-regulatory-lint` | No missing disclaimers + no prohibited claims | **ESCALATE_TO_HUMAN** — never auto-redo regulatory failures |
| 4 | `gtm-pii-scanner` | Zero high-confidence + zero medium-confidence PII findings | **HARD BLOCK** — quarantine artifact, do not route to approval |

Rules:
- Validators run sequentially; if step 1 fails the redo loop resolves step 1 before step 2 runs.
- Auto-redo counter is per-validator, not shared. A brand-validator redo does not consume a claim-checker redo budget.
- `gtm-regulatory-lint` enriches the approval policy chain: if `requires_legal_review: true`, gtm-policy-match adds the `legal_regulated` policy.
- `gtm-pii-scanner` result is logged in audit_log.jsonl but the PII values themselves are never logged.
- In Workstream A/B/C: all four validators return `passed: true` trivially (enforcement inactive). This gate is a no-op until Workstream D.

## Persistence

After the quality gate chain passes:

1. Write `tenants/<id>/cycles/<id>/context_bus/<agent_slug>.output.json`:
   ```json
   {
     "schema_version": "<artifact schema_version>",
     "artifact_version": "1.0.0",
     "tenant_id": "<id>",
     "cycle_id": "<id>",
     "written_by_agent": "<slug>",
     "written_at": "<iso>",
     "quality_signals": { "self_review_score": <0..1>, "citation_count": <n>, ... },
     "payload": { ...the artifact... }
   }
   ```
2. Write `tenants/<id>/cycles/<id>/runs/<run_id>.json`:
   ```json
   {
     "run_id": "<uuid>",
     "agent_slug": "<slug>",
     "status": "completed",
     "started_at": "<iso>",
     "completed_at": "<iso>",
     "prompt_sha": "<sha16>",
     "model_used": "<model id>"
   }
   ```
3. Write the Handoff via `gtm-handoff-validate` skill.
4. Trigger `gtm-policy-match` to enqueue an approval request matched to this artifact.

## Output format

```
[<agent_slug>] Run <run_id_short> — status: completed
  Artifact: tenants/<id>/cycles/<id>/context_bus/<slug>.output.json
  Self-review score: 0.85
  Approval requested: <approval_id_short>
```

## Failure modes

| Mode | Action |
|---|---|
| Prompt not in registry | HARD FAIL before any stage |
| Prompt version mismatch | HARD FAIL before any stage |
| Model alias (not pinned) | HARD FAIL before any stage |
| Missing upstream | STOP with `dependency_error`; do not write |
| Schema mismatch | STOP with `dependency_error` |
| Missing required answer | AskUserQuestion; persist; retry from plan |
| Self-review score < 0.7 | Auto-redo (max 3 iterations); after 3, escalate to user |
| Banned phrase detected | Auto-redo with rubric report as `redo_brief` |
| Brand validation FAIL | Auto-redo (max 3); inject brand revision_brief |
| Claim check FAIL | Auto-redo (max 3); inject claim revision_brief |
| Regulatory lint FAIL | ESCALATE_TO_HUMAN; no auto-redo |
| PII detected | HARD BLOCK; quarantine; no approval routing |
| LLM refusal | Escalate to user; do not retry |

## Do NOT

- Don't write to ContextBus if any stage failed.
- Don't bypass the rubric check.
- Don't bypass the quality gate chain.
- Don't ask the user questions the ConversationStore can answer.
- Don't run real LLM calls if the user said `dry_run=true`.
- Don't auto-redo regulatory failures — escalate to human.
- Don't log PII values in audit events — log finding type + confidence only.

## Workstream notes

**A/B/C:** Prompt registry enforcement is skipped (`dry_run=true` convention).
Quality validators return `passed: true` trivially. The stub-run path remains active for
unknown slugs in dry-run: write a placeholder with `schema_version: "<slug>.Stub:v1.0.0"`.

**D:** Registry enforcement and quality gate chain are fully active. All four validators
run on every artifact. The `prompts/_registry.yaml` must have an entry for every slug or
the run hard-fails.

---
name: gtm-handoff-validate
description: Use this skill to write a typed Handoff envelope after an agent publishes its artifact, and to validate Handoffs that downstream agents are about to consume. Implements the §8.2 dependency contract from the blueprint.
---

# Skill: gtm-handoff-validate

## Two modes

### Mode A — emit (writer-side)

Called by `gtm-agent-run` after an artifact is published to ContextBus.

Inputs: `from_agent`, `tenant_id`, `cycle_id`, `artifact_ref`, `artifact_version`, `schema_version`, `payload_summary`, `quality_signals`, `upstream_chain`.

Write `tenants/<id>/cycles/<cycle>/handoffs/<handoff_id>.json` conforming to `schemas/handoff.schema.json`:

```json
{
  "handoff_id": "<uuid>",
  "from_agent": "<slug>",
  "to_agent": null,
  "cycle_id": "<id>",
  "tenant_id": "<id>",
  "artifact_ref": "<key>",
  "artifact_version": "<semver>",
  "schema_version": "<Name:vX.Y.Z>",
  "payload_summary": { ... 5-10 KV pairs ... },
  "quality_signals": {
    "self_review_score": 0.85,
    "citation_count": 12,
    "unknown_count": 0,
    "brand_validator_pass": true,
    "claim_checker_pass": true,
    "regulatory_lint_pass": true,
    "pii_scan_pass": true
  },
  "expires_at": null,
  "upstream_chain": ["phase1.brief_intake"],
  "created_at": "<iso>",
  "approved_at": null,
  "approval_record_id": null
}
```

When the artifact's approval lands, update `approved_at` + `approval_record_id` in this same file.

### Mode B — validate (reader-side)

Called by `gtm-agent-run` during the plan stage to confirm upstream dependencies are usable.

For each required input `(key, expected_schema_version, require_approved)`:

1. **Exists** — there's a file at `tenants/<id>/cycles/<cycle>/context_bus/<key>.json` (or fall back to tenant baseline path). If not → return `missing:<key>`.
2. **Schema match** — parse the artifact's `schema_version`. The Name and major must match `expected_schema_version`. If not → return `schema_mismatch:<key> (got=<got> need=<expected>)`.
3. **Freshness** — read the consumer's last-consumed marker at `tenants/<id>/cycles/<cycle>/agent_consumptions/<consumer_slug>/<key>.json`. If `artifact_version < last_consumed_version` → return `stale:<key>`.
4. **Quality floor** — if `quality_signals.self_review_score < 0.7` → return `quality_floor:<key> (score=<n>)`. Configurable per consumer via `agent_spec.yaml`.
5. **Approval state** — if `require_approved=true` and `approved_at is null` → return `unapproved:<key>`.

Return the list of problems (empty list = all good). Caller blocks the agent run if any.

## Updating consumption markers

After a consumer successfully reads an input, write/update:
`tenants/<id>/cycles/<cycle>/agent_consumptions/<consumer_slug>/<input_key>.json`:

```json
{ "key": "<key>", "consumed_version": "<semver>", "consumed_at": "<iso>" }
```

This drives the staleness check on subsequent runs.

## Do NOT

- Don't consume an artifact whose `schema_version` major doesn't match.
- Don't run downstream on a `blocks_downstream` artifact without approval.
- Don't silently coerce a `v2` artifact into a `v1` slot.

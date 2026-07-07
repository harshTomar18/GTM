---
name: gtm-context-bus
description: Use this skill to read/write artifacts to the GTM ContextBus — the typed pub/sub layer over the 4-tier memory model (T1 tenant, T2 cycle, T3 run, T4 conversation). Invoked by agents during gather_context and at publish time.
---

# Skill: gtm-context-bus

## Operations

### `put`
Writes an artifact to a tier.

Inputs: `key`, `tier` (T1|T2|T3|T4), `value` (object), `tenant_id`, `cycle_id` (required for T2-T4), `written_by_agent`, `schema_version`, `artifact_version`, `quality_signals`.

Filesystem destination:
- **T1:** `tenants/<id>/baseline/<key>.json` (also markdown rendering at `tenants/<id>/baseline/<key>.md` if applicable)
- **T2:** `tenants/<id>/cycles/<cycle>/context_bus/<key>.json`
- **T3:** in-memory only; never written to disk
- **T4:** `tenants/<id>/answers/<reusable_key>.json` (managed by gtm-question-manager)

### `get`
Reads the latest version of a key, with optional schema-version validation.

Inputs: `key`, `tenant_id`, `cycle_id`, `required_schema_version`, `require_approved` (bool).

Lookup order:
1. Cycle scope (`tenants/<id>/cycles/<cycle>/context_bus/<key>.json`)
2. Tenant scope (`tenants/<id>/baseline/<key>.json`)
3. Raise `HandoffMissing` if neither exists.

Schema check: split `schema_version` on `:` → require major version (first int after `v`) matches.

Approval check: if `require_approved=true`, the artifact must have `approved_at != null`.

### `promote`
Lifts a T4 answer to T2/T1 under a `reusable_key` so it's visible to future agents.

Inputs: `from_value`, `key` (= reusable_key), `to_tier`, `tenant_id`, `cycle_id`, `source_agent`.

### `validate_dependencies`
Given a list of `(key, schema_version, require_approved)` triples, return the list of problems. Used by agent plan stage.

## Schema-version contract

Format: `<Name>:v<Major>.<Minor>.<Patch>`. Example: `PersonaSpec:v2.1.0`.

Compatibility rule: receiver and producer must share the same `<Name>:v<Major>`. A
minor/patch bump is additive; a major bump requires receiver upgrade.

## Audit

Every `put` writes an audit record:
```json
{"ts":"<iso>","event":"context_bus.put","actor":"<written_by_agent>","subject_type":"artifact","subject_id":"<key>","tenant_id":"<id>","cycle_id":"<id>"}
```

Every `get` that finds nothing writes:
```json
{"ts":"<iso>","event":"context_bus.miss","actor":"<reader>","subject_type":"artifact","subject_id":"<key>"}
```

## Do NOT

- Don't overwrite a file in place — append a new artifact_version row.
  (Filesystem version: rename the existing file to `<key>.v<prev>.json` before writing the new one.)
- Don't return an artifact whose `schema_version` major doesn't match the requested one.
- Don't bypass `require_approved` for downstream-blocking artifacts (research dossier, narrative lock, KPI framework).

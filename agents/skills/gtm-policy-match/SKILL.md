---
name: gtm-policy-match
description: Use this skill to match an artifact's attributes against the approval policy set and enqueue an approval request with the right roles. Invoked at the end of gtm-agent-run.
---

# Skill: gtm-policy-match

## What it does

Reads `governance/approval_policies.yaml`, matches an artifact's attributes against each
policy's `when` condition (AND across non-null fields), unions the required roles, and
writes a new `ApprovalRecord` to disk.

## Required inputs

| Field | Source |
|---|---|
| `artifact_type` | Agent slug last segment, e.g. `positioning`, `website_copy` |
| `content_text` | The artifact's textual body (used for `content_contains_*` matchers) |
| `author_voice_role` | Optional; set when the artifact is ghost-written |
| `total_spend_usd` | Optional; set for budget-bearing artifacts |
| `profile` | The loaded TenantProfile (used to resolve `content_contains_any_from: profile.frameworks` etc.) |
| `tenant_id`, `cycle_id`, `artifact_ref`, `artifact_version` | All |

## Matching logic

For each policy in `approval_policies.yaml`:
- Check each non-null field in `when`. ALL must match for the policy to fire.
  - `artifact_types`: `artifact_type ∈ list`
  - `content_contains_any`: any term (case-insensitive substring) in `content_text`
  - `content_contains_any_from`: resolve `profile.<path>` to a list, then substring-match
  - `content_contains_pattern`: regex against `content_text`
  - `author_voice_role`: `author_voice_role ∈ list`
  - `total_spend_usd_gt`: `total_spend_usd > threshold`
  - `profile_flag`: resolve `profile.<path>` and check truthiness
- Collect all matched policies. Sort by `priority` ascending (lower = earlier).
- Union all `requires` role lists, preserving order.
- If no policies match → use `defaults.unmatched_artifact.requires` (default: `[CMO]`).

## Writing the ApprovalRecord

Write to `tenants/<id>/cycles/<cycle>/approvals/<approval_id>.json`:

```json
{
  "schema_version": "ApprovalRecord:v1.0.0",
  "approval_id": "<uuid>",
  "artifact_ref": "<key>",
  "artifact_version": "<semver>",
  "policies_matched": ["brand_impacting", "framework_or_regulated_claims"],
  "required_roles": ["CMO", "SME"],
  "approvals_received": {},
  "decision": "pending",
  "requested_at": "<iso>",
  "decided_at": null,
  "comment": null,
  "revision_iteration": 0
}
```

## Audit entry

```json
{"ts":"<iso>","event":"approval.requested","actor":"system","actor_role":"system","subject_type":"artifact","subject_id":"<artifact_ref>","tenant_id":"<id>","cycle_id":"<cycle>","policies_matched":["..."],"rationale":"v=<version>; roles=<csv>"}
```

## Output

```
[approval] Enqueued <approval_id_short> for <artifact_ref>
   Policies: <comma-joined>
   Required roles: <comma-joined>
   SLA: <max hours across matched policies>h
```

## Do NOT

- Don't auto-approve, ever — even for system-generated artifacts.
- Don't strip roles that weren't requested by a matched policy. Union, don't intersect.
- Don't proceed downstream of a `blocks_downstream: true` policy until the approval lands.

---
name: gtm-approve
description: Use this skill when an approver wants to APPROVE a pending approval request. Triggered by "approve <id>", "/gtm-approve", or interactive approval flows. Updates the ApprovalRecord, may also fully approve the artifact if all required roles have signed off.
---

# Skill: gtm-approve

## Required inputs

| Field | Source |
|---|---|
| `approval_id` | User-provided (full or short prefix) |
| `approver_role` | User-provided (must be in `required_roles`) |
| `approver_name` | User-provided OR default `"CLI"` |
| `comment` | Optional |

## Steps

1. **Resolve approval_id:** scan `tenants/*/cycles/*/approvals/<approval_id>*.json` and load the matching file. If multiple match a prefix, list them and ask user to disambiguate.
2. **Validate role:** if `approver_role` ∉ `required_roles`, reject with: `Role X is not required for this approval; required: [...]`.
3. **Update approvals_received:** add `approver_role: <iso_timestamp>`.
4. **Decide:**
   - If every role in `required_roles` is now in `approvals_received` → set `decision: approved`, `decided_at: <iso>`.
   - Else → keep `decision: pending`.
5. **Write back** to the same JSON file.
6. **Audit log entry:**
   ```json
   {"ts":"<iso>","event":"approval.decision","actor":"<approver_name>","actor_role":"<approver_role>","subject_type":"approval","subject_id":"<approval_id>","tenant_id":"<id>","cycle_id":"<cycle>","policies_matched":[...],"rationale":"<comment>","before":{"decision":"<prev>"},"after":{"decision":"<new>"}}
   ```
7. **If fully approved:** update the underlying artifact's Handoff record by setting `approved_at` and `approval_record_id`. This unblocks downstream agents.

## Output

```
✓ Recorded approval from <approver_role> (<approver_name>) for <approval_id_short>
   Decision now: <decision>
   <if pending> Waiting on: <remaining roles>
   <if approved> Downstream unblocked: <artifact_ref>
```

## Do NOT

- Don't allow a role to approve twice (overwrite the timestamp silently is OK; do not change `decision` back from `rejected` to `pending`).
- Don't approve on behalf of someone else without explicit user instruction including their name.
- Don't bypass `revision_iteration > max_iterations` — those need escalation, not approval.

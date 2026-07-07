---
name: gtm-reject
description: Use this skill when an approver wants to REJECT a pending approval (or request revisions). Triggered by "reject <id>", "/gtm-reject", or interactive flows. Records the decision, writes audit log, and may auto-trigger a redo loop if the policy allows.
---

# Skill: gtm-reject

## Required inputs

| Field | Source |
|---|---|
| `approval_id` | User-provided |
| `approver_role` | User-provided |
| `approver_name` | User-provided OR `"CLI"` |
| `decision` | `rejected` or `revisions_requested` (default: `rejected`) |
| `comment` | **REQUIRED** for rejection — drives the redo brief |

## Steps

1. **Resolve approval_id** (see `gtm-approve` skill).
2. **Validate role** is in `required_roles`.
3. **Comment guard:** if no `comment`, ask the user for one before proceeding. A rejection without a comment is unhelpful — the downstream redo loop has no signal.
4. **Update**: set `decision: rejected | revisions_requested`, `decided_at: <iso>`, `comment: <comment>`, increment `revision_iteration` by 1.
5. **Audit log entry:** `approval.decision` event with `decision: rejected` (or `revisions_requested`) and the comment as `rationale`.
6. **Revision loop check:**
   - Load the matched policies. Find the max `revision_loop.max_iterations` (default 3).
   - If `revision_iteration >= max_iterations` → write an `approval.escalated` audit event and surface to the user: `"Max iterations reached. Escalating to <on_exceed role>."`
   - Else → emit a hint to re-run the agent with the comment as `redo_brief`: `"Re-run <agent_slug> with the comment as the revision brief."`

## Output

```
✕ Rejected <approval_id_short> by <approver_role> (<approver_name>)
   Decision: rejected
   Comment: <comment>
   Revision iteration: <n>/<max>
   <if not maxed>  Next: re-run <agent_slug> with the comment as revision brief
   <if maxed>      ESCALATED to <on_exceed role>
```

## Do NOT

- Don't accept a rejection without a comment.
- Don't reset `revision_iteration` to 0.
- Don't auto-rerun the agent. The redo trigger is a user action (or a follow-up `gtm-agent-run` invocation with `redo_brief` set).

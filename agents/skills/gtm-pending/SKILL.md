---
name: gtm-pending
description: Use this skill to list pending approval requests for a tenant. Triggered by "what's pending", "show pending approvals", "/gtm-pending".
---

# Skill: gtm-pending

## Required inputs

| Field | Source |
|---|---|
| `tenant_id` | User |
| `cycle_id` | Optional |
| `role` | Optional — filter to approvals where this role is in `required_roles` and not yet in `approvals_received` |

## Steps

1. **Discover** every file matching `tenants/<tenant_id>/cycles/*/approvals/*.json` (or scope to one cycle if provided).
2. **Filter** to records with `decision == "pending"`.
3. **If role filter set:** only include records where `role ∈ required_roles` and `role ∉ approvals_received`.
4. **Sort** by `requested_at` ascending (oldest first).
5. **Compute SLA status** for each: load `governance/approval_policies.yaml`, find max `sla_hours` across matched policies. Status: `on_track | due_soon (<6h) | overdue`.
6. **Render** a table.

## Output

```
Tenant: <id>
Pending approvals: <n>

┌──────────┬───────────────────────────┬─────────┬────────────────────┬──────────┬──────────┐
│ ID       │ Artifact                  │ Version │ Required Roles     │ Received │ SLA      │
├──────────┼───────────────────────────┼─────────┼────────────────────┼──────────┼──────────┤
│ a1b2c3d4 │ phase2.positioning.output │ 1.0.0   │ CMO, CEO           │ CMO      │ overdue  │
│ e5f6g7h8 │ phase3.website_copy.…     │ 1.1.0   │ CMO, SME           │ —        │ on_track │
└──────────┴───────────────────────────┴─────────┴────────────────────┴──────────┴──────────┘
```

Empty case: `No pending approvals.`

## Do NOT

- Don't return approvals that have already been decided.
- Don't include the full artifact payload — the IDs and refs are enough; the user opens what they want via `gtm-dashboard` or by reading the file.

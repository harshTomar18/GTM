---
description: List pending approval requests for a tenant.
argument-hint: tenant=<id> [cycle=<id>] [role=<role>]
---

Arguments: $ARGUMENTS

Required: `tenant=<id>`. Optional: `cycle=<id>` to scope to one cycle; `role=<role>` to filter to approvals where this role is required but hasn't approved yet.

Invoke the **gtm-pending** skill. Render the table.

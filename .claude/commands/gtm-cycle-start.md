---
description: Start a GTM cycle for a tenant (dry-run by default; pass `live=true` to execute).
argument-hint: tenant=<id> cycle=<id> [live=true] [objective="..."]
---

Arguments: $ARGUMENTS

Required: `tenant=<id>` and `cycle=<id>` (free-form, e.g. `2026-Q3`).
Optional: `live=true` (default `false`, i.e. dry-run); `objective="..."` (recommended).

Invoke the **gtm-cycle-start** skill with `dry_run` set to the negation of `live`.

Before invoking, verify the tenant exists at `tenants/<tenant>/` and the profile validates. If not, refuse and tell the user to run `/gtm-tenant-init` first.

After completion, print:
1. The compiled DAG diagram.
2. (If live) The list of agent runs with status + cost.
3. The next pending approval (if any) and what to do about it.

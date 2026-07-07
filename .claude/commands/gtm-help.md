---
description: Show the full list of GTM OS slash commands with usage examples.
---

Print the following help block verbatim, then suggest a starting command based on the tenant state (if any `tenants/<id>/` exists, recommend `/gtm-dashboard`; otherwise `/gtm-tenant-init`).

```
Universal GTM OS — Slash Commands
═════════════════════════════════════════════════════════════════════

▸ Setup
  /gtm-tenant-init tenant=<id> [pack=<pack_id>]
       Onboard a new tenant by scaffolding from the example.

  /gtm-validate-profile <tenant_id>
       Validate a tenant_profile.yaml against the schema.

▸ Cycles
  /gtm-cycle-start tenant=<id> cycle=<id> [live=true] [objective="..."]
       Start (dry-run by default) or execute a cycle.

  /gtm-agent-run tenant=<id> cycle=<id> agent=<slug>
       Run a single agent in an active cycle.

▸ Approvals
  /gtm-pending tenant=<id> [cycle=<id>] [role=<role>]
       List pending approval requests.

  /gtm-approve <approval_id> as=<role> [comment="..."]
       Approve a pending request.

  /gtm-reject <approval_id> as=<role> comment="..." [revisions=true]
       Reject (with required comment) or request revisions.

▸ Observability
  /gtm-dashboard tenant=<id>
       Tenant-wide status: active cycles, recent runs, pending approvals.

▸ Help
  /gtm-help
       This help.

Workstreams
─────────────────────────────────────────────────────────────────────
  A — Foundations (current)             plumbing + framework
  B — Phase 1+2 agents                  Research + Narrative
  C — Phase 3+4 agents                  Assets + Distribution
  D — Phase 5 + Enterprise layer        Measurement + Signals + Governance

Until B ships, agents resolve to stubs that exercise the framework but
produce placeholder artifacts.
```

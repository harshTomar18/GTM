# Approval Policies — Human-Readable Reference

This file describes the policies declared in `approval_policies.yaml`. The YAML is the
source of truth; this file is for humans skimming the rules.

## Why policy-driven gates?

Gates are not coupled to phase positions. A spend-heavy artifact in Week 2 should still
hit the CFO. A framework-claim in a blog still needs SME review. Policies match against
**artifact attributes** (type, content, voice, spend) so the right approvers see the
right work regardless of when in the cycle it appears.

## Active Policies

| ID | When it fires | Requires | SLA | Escalation |
|---|---|---|---|---|
| `phase_exit_gate` | Major synthesis artifacts (research dossier, narrative lock, KPI framework) | CMO + SalesLeader | — | blocks_downstream |
| `brand_impacting` | Positioning, messaging, narrative lock, website copy, campaign brief | CMO | 48h | CEO at 72h |
| `legal_regulated` | Regulated-industry tenants publishing customer-facing copy | SME + Legal | 48h | — |
| `framework_or_regulated_claims` | Any content citing tenant's declared frameworks | SME | 24h | — |
| `budget_threshold` | Paid media / channel plan / calendar with spend > $25k | CFO | — | CEO after 3 rejections |
| `customer_named` | Content matching `@customer.(case_study\|logo)` pattern | Legal + CustomerSuccess | — | — |
| `executive_voice` | Author-voice ghost-written content for C-suite | CEO | — | — |

Unmatched artifacts default to: requires CMO.

## Adding a Policy

1. Append a new entry under `policies:` in `approval_policies.yaml`.
2. Update this table.
3. Run the eval harness — golden sets should not regress.
4. Commit, request review from the GTM Ops owner.

## Revision Loops

A `revision_loop` block bounds the redo cycle:

```yaml
revision_loop:
  max_iterations: 3
  on_exceed: escalate_to_CEO
```

After `max_iterations` rejections, the artifact escalates to the named role. The
ApprovalEngine refuses further redos until escalation is resolved.

---
description: Approve a pending approval request.
argument-hint: <approval_id_or_prefix> as=<role> [name="..."] [comment="..."]
---

Arguments: $ARGUMENTS

Required: positional `approval_id` (full uuid or 8-char prefix) and `as=<role>`. Optional: `name="..."` (defaults to `CLI`), `comment="..."`.

Invoke the **gtm-approve** skill. After it returns, if the approval transitioned to `approved`:
- Note that downstream agents are now unblocked.
- Suggest `/gtm-cycle-start tenant=... cycle=... live=true` to continue the cycle if it was paused.

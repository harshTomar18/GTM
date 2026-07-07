---
description: Reject a pending approval (or request revisions). A comment is required.
argument-hint: <approval_id_or_prefix> as=<role> comment="..." [name="..."] [revisions=true]
---

Arguments: $ARGUMENTS

Required: positional `approval_id` (uuid or 8-char prefix), `as=<role>`, and `comment="..."`. The comment becomes the redo brief. Optional: `name="..."`; `revisions=true` to use `revisions_requested` instead of `rejected`.

If no `comment` is provided, REFUSE and ask the user for one. Rejections without comments are not allowed.

Invoke the **gtm-reject** skill. Report the next step (re-run agent with redo brief, OR escalation if max iterations reached).

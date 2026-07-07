---
description: Run a single GTM agent within an active cycle.
argument-hint: tenant=<id> cycle=<id> agent=<slug>
---

Arguments: $ARGUMENTS

Required: `tenant=<id>`, `cycle=<id>`, `agent=<slug>` (e.g. `phase1.brief_intake`).

Invoke the **gtm-agent-run** skill. Report run id, status, artifact ref, self-review score, and the approval id (if one was enqueued).

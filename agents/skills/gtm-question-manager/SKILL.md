---
name: gtm-question-manager
description: Use this skill to resolve an agent's required inputs by checking the ConversationStore for prior answers (via reusable_key) and surfacing only the missing differential to the user. Invoked by agents during the plan stage.
---

# Skill: gtm-question-manager

## What it does

Given an agent's `questions.yaml`, returns either:
- `ready` — all required answers are present (from cache or defaults)
- `need_answers` — list of missing required questions to surface to the user

Then persists user-provided answers and promotes any with `reusable_key` to T2/T1.

## Required inputs

| Field | Source |
|---|---|
| `question_set_path` | `agents/<phase>/<slug>/questions.yaml` |
| `tenant_id` | Cycle context |
| `cycle_id` | Cycle context |
| `required_for` | `plan` | `gather` | `synthesize` | `write` (default `plan`) |

## Steps

1. **Load** the `questions.yaml` and parse against `schemas/question_set.schema.json`.
2. **For each question** with `required_for` ≤ current stage (order: plan < gather < synthesize < write < optional):
   a. **Reuse lookup:** if the question has a `reusable_key`, check `tenants/<id>/answers/<reusable_key>.json` first, then `tenants/<id>/cycles/<cycle>/answers/<reusable_key>.json`. If found, return that value as `source: reuse_t1|reuse_t2`.
   b. **Per-agent lookup:** if no reusable_key match, check `tenants/<id>/cycles/<cycle>/agent_questions/<agent_slug>/<question_id>.json` for a prior cycle answer.
   c. **Default:** if no answer found, use `question.default` if set.
   d. **Missing:** if nothing matches, add to the `missing` list.
3. **Return:**
   - If `missing` is non-empty → return `{status: "need_answers", missing: [...], already_answered: {...}}` so the agent caller can `AskUserQuestion`.
   - Else → return `{status: "ready", answers: {...}}`.

## Recording answers

When the caller has user answers in hand:

For each `(question, answer_value)`:
1. Write `tenants/<id>/cycles/<cycle>/agent_questions/<agent_slug>/<question_id>.json`:
   ```json
   {
     "answer_id": "<uuid>",
     "question_id": "<id>",
     "agent_slug": "<slug>",
     "answer_value": "...",
     "type": "<text|number|...>",
     "source": "user",
     "reusable_key": "<key or null>",
     "answered_at": "<iso>"
   }
   ```
2. If `reusable_key` is set, also write `tenants/<id>/answers/<reusable_key>.json` (T1) OR `tenants/<id>/cycles/<cycle>/answers/<reusable_key>.json` (T2) depending on the question's intended scope. T2 by default unless the question's metadata says `scope: tenant`.
3. Audit log entry: `agent.question.answered`.

## Decoding stored values

| `type` | Decode rule |
|---|---|
| `text`, `long_text`, `enum` | Use string as-is |
| `number` | Parse as int if no `.`, else float |
| `boolean` | `true` if value lowercases to `1|true|yes|y` |
| `date` | ISO date string |
| `json` | `json.loads(value)` |

## Do NOT

- Don't re-ask questions whose `reusable_key` resolves.
- Don't ask `required_for: optional` questions during `plan` stage.
- Don't proceed past a `need_answers` return — block the agent run.
- Don't promote answers without an explicit `reusable_key`.

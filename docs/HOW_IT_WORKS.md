# How It Works — Day-to-Day Operation

This is the operator's guide. If you're using the Universal GTM OS to run a cycle,
this is what you do.

---

## TL;DR

```
/gtm-tenant-init tenant=acme pack=saas_plg   ← once per tenant
/gtm-cycle-start tenant=acme cycle=2026-Q3   ← dry-run to see the DAG
/gtm-cycle-start tenant=acme cycle=2026-Q3 live=true objective="..."
   ↓ (Claude walks the DAG, agents fire, you answer questions as they come)
/gtm-pending tenant=acme                     ← see what's waiting on you
/gtm-approve <id> as=CMO comment="..."       ← unblock the next phase
   ↓ (continue until the cycle completes)
/gtm-dashboard tenant=acme                   ← see the current state
```

---

## Mental model: Claude is the runtime

There is no server. Every operation is you talking to Claude Code, Claude reading
some files, asking you questions if needed, writing some files, and reporting back.

Three primitives you'll see:

1. **You type a slash command.** Claude looks up `.claude/commands/<cmd>.md`, reads
   the instructions, and invokes one or more skills.
2. **A skill runs.** Skills are recipes for Claude that say "read these files, do
   this transformation, write those files, ask if missing."
3. **Files persist.** Everything is on disk under `tenants/<id>/`. You can open any
   file in your editor; the system has no hidden state.

---

## A typical session

### 0. (Once per machine) clone & open the repo

```
cd Generic\ GTM\ Agents/Universal-GTM-OS
```

Open this directory in Claude Code. The `.claude/skills/` and `.claude/commands/`
folders are picked up automatically.

### 1. Onboard a tenant

```
/gtm-tenant-init tenant=acme pack=_template
```

Claude:
1. Copies `tenants/_example/` to `tenants/acme/`.
2. Edits `tenants/acme/tenant_profile.yaml` to set `profile_id: acme` and
   `extends: vertical_packs/_template`.
3. Runs `gtm-validate-profile` on the result.
4. Tells you what to edit before going live.

Now open `tenants/acme/tenant_profile.yaml` and fill in:
- `company.legal_name`, `brand_name`, `description_short`, `description_long`
- `industry.primary`
- `lob` (at least one line of business)
- `icp_archetypes` (at least one)
- `frameworks` (the authority anchors you can claim)
- `brand_voice.banned_phrases` (phrases you never want to see in output)
- `approval_roles` (who approves what — names + roles)

Then re-validate:

```
/gtm-validate-profile acme
```

### 2. Compile the DAG (dry-run)

```
/gtm-cycle-start tenant=acme cycle=2026-Q3
```

Claude reads `workflows/cycle.yaml`, compiles the 27-agent DAG, and prints:

```
═══ Cycle 2026-Q3 for tenant acme ═══
Mode: DRY-RUN

== Phase 1: phase1_research ==
  • phase1.brief_intake
  • phase1.market_research ← phase1.brief_intake
  • phase1.audience_intelligence ← phase1.brief_intake
  • phase1.keyword_intent ← phase1.brief_intake
  • phase1.research_synthesis ← phase1.market_research,phase1.audience_intelligence,phase1.keyword_intent
  ★ Exit gate: phase_exit_gate
== Phase 2: phase2_narrative ==
  • phase2.positioning ← phase1.research_synthesis
  …
```

Read it. If anything looks wrong, stop and fix `workflows/cycle.yaml` before going
live.

### 3. Go live

```
/gtm-cycle-start tenant=acme cycle=2026-Q3 live=true objective="Land 5 healthcare-provider ICPs in ABM tier"
```

Claude starts executing batch by batch. The first agent that needs input from you
(typically `phase1.brief_intake`) will pause and ask via `AskUserQuestion`. Answer
the questions. The agent finishes, publishes its artifact, enqueues an approval if
the policy demands one, and Claude moves to the next agent.

When a **phase exit gate** is reached, Claude stops and tells you:

```
★ Phase 1 exit gate reached.
  Approval id: a1b2c3d4
  Required roles: CMO, SalesLeader
  Artifact: tenants/acme/cycles/2026-Q3/context_bus/phase1.research_synthesis.output.json

Next: review the artifact, then run /gtm-approve a1b2c3d4 as=CMO  (and again as=SalesLeader)
```

### 4. Approve to unblock

Open the artifact JSON file. Skim the payload. If it's good:

```
/gtm-approve a1b2c3d4 as=CMO comment="Sharp positioning angle. Approved."
/gtm-approve a1b2c3d4 as=SalesLeader name="Jane Doe"
```

If it's not:

```
/gtm-reject a1b2c3d4 as=CMO comment="Audience selection feels off — we should focus on regulated mid-market, not enterprise. Re-run with that constraint."
```

Then re-run the agent with the comment as the redo brief:

```
/gtm-agent-run tenant=acme cycle=2026-Q3 agent=phase1.research_synthesis
```

(The skill picks up the latest rejection comment automatically.)

### 5. Resume the cycle

After approval lands, continue:

```
/gtm-cycle-start tenant=acme cycle=2026-Q3 live=true
```

Claude detects `cycle_state.yaml` with `status: running`, finds the last completed
batch, and picks up at the next one.

### 6. Watch progress

Anytime:

```
/gtm-dashboard tenant=acme
/gtm-pending tenant=acme
/gtm-pending tenant=acme role=CMO   ← only what's waiting on you
```

---

## Question-answering flow

Many agents need input only you can provide (budget, deadlines, named competitors,
strategic constraints). Here's how it works:

1. Agent's plan stage loads its `questions.yaml`.
2. For each required question, the QuestionManager skill checks:
   - `tenants/<id>/answers/<reusable_key>.json` (T1 — prior cycles)
   - `tenants/<id>/cycles/<id>/answers/<reusable_key>.json` (T2 — this cycle)
   - `tenants/<id>/cycles/<id>/agent_questions/<slug>/<qid>.json` (per-agent)
3. Anything still missing → Claude uses `AskUserQuestion` to surface them all at
   once. You answer in the chat.
4. Answers persist:
   - If the question has `reusable_key`, the answer is promoted (other agents that
     ask the same key reuse silently).
   - Otherwise, it's per-agent and per-cycle.

You will almost never be asked the same question twice across a tenant's lifetime
if `reusable_key` is set correctly.

---

## Approval flow

Every artifact that mutates published-facing work hits an approval gate.

| Artifact type | Default approver | Why |
|---|---|---|
| Positioning, messaging matrix, narrative lock, website copy | CMO | Brand-impacting |
| Anything citing your declared frameworks | SME | Technical accuracy |
| Anything in regulated industries | SME + Legal | Compliance |
| Channel plan / paid media setup with spend > $25k | CFO | Budget |
| Customer-named content | Legal + CustomerSuccess | Legal review + relationship |
| Executive ghost-written voice | CEO | Personal-brand risk |
| Phase 1/2/5 exit synthesis | CMO + SalesLeader | Blocks downstream |

Policies are in `governance/approval_policies.yaml`. You can add a new policy by
appending a new entry — the engine picks it up on next invocation, no restart.

---

## Revision loops

When you reject:
1. The `comment` you provide becomes the **redo brief** for the agent's next run.
2. `revision_iteration` increments.
3. If iterations exceed `max_iterations` (default 3), the approval auto-escalates
   to the policy's `on_exceed` role (default CEO). You can't keep rejecting forever
   without escalating — the system forces a conversation.

---

## Reactive signals (Workstream D)

When that ships:
- External events (intent spike, competitor press release, KPI miss) land as JSON
  files in `tenants/<id>/signals/`.
- A reactive dispatcher skill matches signals to subscribed agents.
- Subscribed agents file `PENDING_INSERT` actions into the active cycle for your
  review — they never auto-execute.

---

## Multi-tenant operation

Each tenant is a self-contained folder under `tenants/`. Switching tenants is just
passing a different `tenant=<id>` argument. The governance log is shared but tagged
with `tenant_id`. There's nothing else to know.

---

## Editing things by hand

Because everything is files, you can:

- **Edit a tenant_profile.yaml** between cycles. Just re-run `/gtm-validate-profile`.
- **Inject a one-off artifact** by writing the JSON yourself under
  `context_bus/<key>.json` conforming to the schema. Downstream agents will pick it
  up.
- **Edit an artifact** mid-approval. Versioning is by file rename, so save the prior
  version as `<key>.v<prev>.json` before saving the new one.
- **Replay history.** Walking `audit_log.jsonl` chronologically reconstructs the
  full system state.

The system trusts you. Use that power carefully.

---

## What to do when things go wrong

| Symptom | Fix |
|---|---|
| `gtm-validate-profile` reports a missing field | Open the YAML, add the field. Check `schemas/tenant_profile.schema.json` for the required shape. |
| Agent run pauses indefinitely | Run `/gtm-pending tenant=<id>` — there's almost certainly a pending approval. |
| "Schema mismatch" error | An upstream agent produced a `v2` artifact but the downstream expects `v1`. Bump the downstream's `agent_spec.yaml inputs[].schema_version` and re-run. |
| Two artifacts with the same key | The last write wins — but earlier versions are preserved as `<key>.v<ver>.json`. Compare the diff before deciding. |
| Cycle won't resume | Inspect `cycle_state.yaml`. If `status` is `aborted`, change it to `running` and re-run `/gtm-cycle-start`. |
| Slash command not found | Make sure your Claude Code working directory is `Universal-GTM-OS/`. The `.claude/` folder is only picked up when this is the project root. |

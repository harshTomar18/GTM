# Quickstart

Get from zero to a dry-run cycle in 5 minutes.

---

## 0. Prerequisite

Claude Code installed, with this folder (`Universal-GTM-OS/`) opened as the project
root. **No Python required.** No pip install. No database setup. Nothing else.

Confirm by running `/gtm-help` — you should see the full slash-command list.

---

## 1. Verify the example tenant

```
/gtm-validate-profile _example
```

You should see:

```
✓ Profile valid: _example (Acme)
   Primary motion: enterprise_abm
   Primary ICP: mid_market_finance_ops
   Frameworks: SOX, GAAP
   Languages: en-US (supported: en-US, en-GB)
```

If you don't see this, something in the repo is broken — check that
`tenants/_example/tenant_profile.yaml` exists.

---

## 2. Compile a dry-run cycle

```
/gtm-cycle-start tenant=_example cycle=2026-Q3
```

Claude will print the full 27-agent DAG with phase boundaries and exit gates. Read
it. This is the workflow that would execute if you said `live=true`.

---

## 3. Create your real tenant

```
/gtm-tenant-init tenant=acme pack=_template
```

This clones `tenants/_example/` to `tenants/acme/`, patches the profile_id, and
validates. Now edit `tenants/acme/tenant_profile.yaml` to put in real data:

- `company.legal_name`, `brand_name`, `description_short`
- `industry.primary` (e.g. `fintech_b2b_saas`, `healthcare_provider`,
  `manufacturing_industrial`)
- `lob` — at least one line of business with a declared motion
- `icp_archetypes` — at least one with a buying_committee
- `frameworks` — your authority anchors
- `brand_voice.banned_phrases` — your linguistic guardrails
- `approval_roles` — names + roles of who approves what

Then re-validate:

```
/gtm-validate-profile acme
```

---

## 4. Run a real cycle (when you're ready)

```
/gtm-cycle-start tenant=acme cycle=2026-Q3 live=true objective="<your cycle goal>"
```

Claude will start executing. The first agent that needs input (`phase1.brief_intake`)
will pause and ask you a small set of questions in the chat. Answer them.

After each phase, an approval gate will surface. Review the artifact, then:

```
/gtm-approve <approval_id> as=<role> comment="..."
```

Continue until the cycle completes.

---

## 5. What to expect in Workstream A vs. later

**Workstream A (you are here):**
- All plumbing in place: skills, slash commands, schemas, governance, DAG.
- Agents are **stubs** — they produce placeholder artifacts that exercise the
  framework's flow (handoff, approval, audit log) but contain no real GTM content.
- This lets you validate the system architecture without depending on agent quality.

**Workstream B (next):** Phase 1 (Research) + Phase 2 (Narrative) agents land. These
are the foundational synthesis agents — Brief Intake, Market Research, Audience
Intelligence, Keyword Mapping, Research Synthesis, then Positioning, Value Prop,
Messaging Matrix, Content Pillars, Narrative Lock.

**Workstream C:** Phase 3 (Assets) + Phase 4 (Distribution) — the 12 production
agents. Website Copy, Content Assets, Email, Social, Paid Ad, Sales Enablement,
Channel Strategy, Campaign Calendar, SEO, Paid Media, Outbound/Partner, Community.

**Workstream D:** Phase 5 (Measurement) + Enterprise Layer — Signal Bus, Experiment
Engine, Attribution, Brand Validator, Claim Checker, Regulatory Lint, PII Scanner,
Executive Brief, Competitive Pulse.

---

## Most common first-time issues

| Symptom | Likely cause | Fix |
|---|---|---|
| "Slash command not found" | Working directory isn't `Universal-GTM-OS/` | `cd` into the folder, restart Claude Code |
| Validation reports missing `lob` or `icp_archetypes` | You skipped these in the YAML | Even one entry each is fine; the schema needs the lists to exist |
| Dry-run prints fewer than 27 agents | `workflows/cycle.yaml` got edited | `git diff workflows/cycle.yaml`, revert if intentional |
| `gtm-cycle-start live=true` doesn't ask you anything | You're still in dry-run | Confirm `live=true` is in the command |
| Approval id not found | You typed the short prefix wrong | `/gtm-pending tenant=<id>` to see exact ids |

---

## What to read next

- `docs/HOW_IT_WORKS.md` — the operator guide (longer).
- `docs/ARCHITECTURE.md` — the system view.
- `docs/STATE_LAYOUT.md` — every file the system writes, and why.
- `docs/DATA_FLOW.md` — how information moves between agents.
- `docs/ADDING_A_VERTICAL_PACK.md` — when you're ready to ship your first pack.
- `~/.claude/plans/c-users-17168-downloads-gtm-blueprint-1-fizzy-sparrow.md` — the
  enterprise blueprint that informed every decision.

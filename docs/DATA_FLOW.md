# Data Flow

How information moves through the system, across agents, and between human and machine.

---

## The five primary flows

1. **Tenant onboarding flow** — first time a tenant is set up.
2. **Cycle start flow** — kicking off a new GTM cycle.
3. **Agent run flow** — one agent's five-stage pipeline.
4. **Question flow** — how missing inputs become user prompts.
5. **Approval flow** — DRAFT → APPROVED state machine.

---

## 1. Tenant onboarding flow

```
USER: /gtm-tenant-init tenant=acme pack=saas_plg
   │
   ▼
gtm-tenant-init SKILL
   │
   ├──► cp -r tenants/_example tenants/acme
   │
   ├──► edit tenants/acme/tenant_profile.yaml
   │     - profile_id: acme
   │     - extends: vertical_packs/saas_plg
   │
   ├──► gtm-validate-profile SKILL
   │       reads tenants/acme/tenant_profile.yaml
   │       reads vertical_packs/saas_plg/profile_defaults.yaml
   │       deep-merges pack defaults underneath
   │       validates against schemas/tenant_profile.schema.json
   │       returns OK | issue list
   │
   ├──► append audit_log.jsonl  (tenant.initialized)
   │
   └──► report to user:
        ✓ Created tenant acme at tenants/acme/
          Pack: saas_plg
          Profile validated.
          Next: edit profile, then /gtm-cycle-start tenant=acme cycle=...
```

---

## 2. Cycle start flow

```
USER: /gtm-cycle-start tenant=acme cycle=2026-Q3 live=true
   │
   ▼
gtm-cycle-start SKILL
   │
   ├──► gtm-validate-profile (refuse if invalid)
   │
   ├──► load workflows/cycle.yaml
   │
   ├──► compile DAG (topological sort, phase-pure batches)
   │
   ├──► if dry-run:
   │       print diagram, STOP
   │
   ├──► else (live):
   │       create tenants/acme/cycles/2026-Q3/
   │       write cycle_state.yaml (status: running)
   │       append audit_log.jsonl (cycle.start)
   │
   │       FOR EACH batch:
   │         FOR EACH agent in batch (sequential or parallel per user):
   │           Invoke gtm-agent-run SKILL  (see flow 3)
   │         IF this is the last batch of a phase with exit_gate:
   │           wait for matching approval to land
   │           pause cycle (status: paused)
   │           return to user with "approval needed"
   │
   └──► on completion: cycle_state.yaml status=completed
```

---

## 3. Agent run flow (five-stage pipeline)

```
gtm-agent-run SKILL  (tenant, cycle, agent)
   │
   ▼
─── STAGE 1: PLAN ─────────────────────────────────────────────────────
   load agents/<phase>/<slug>/agent_spec.yaml
   load agents/<phase>/<slug>/questions.yaml
   │
   gtm-handoff-validate SKILL — validate each required upstream:
     ▸ exists? ▸ schema match? ▸ fresh? ▸ quality floor? ▸ approved?
     │
     IF any problem → status=blocked, STOP
   │
   gtm-question-manager SKILL — resolve required answers:
     ▸ check T1 answers (tenants/<id>/answers/<key>.json)
     ▸ check T2 answers (tenants/<id>/cycles/<id>/answers/<key>.json)
     ▸ check per-agent (tenants/.../agent_questions/<slug>/<qid>.json)
     ▸ if missing → AskUserQuestion(missing[])
                    user answers in chat
                    persist answers; promote ones with reusable_key
                    retry from PLAN
   │
─── STAGE 2: GATHER CONTEXT ───────────────────────────────────────────
   for each input in agent_spec.inputs:
     gtm-context-bus.get(key, schema_version) → payload
   for each profile_key in agent_spec.profile_keys:
     read from tenant_profile.yaml
   (optionally) run web search / MCP calls per agent prompt
   │
─── STAGE 3: SYNTHESIZE ───────────────────────────────────────────────
   render prompt = [
     block 1: prompts/_shared/profile_header.md (with profile)
     block 2: prompts/_shared/cycle_header.md (with cycle_state)
     block 3: agents/<phase>/<slug>/prompt.md (with inputs)
   ]
   call LLM (per agent_spec.model_synthesize)
   parse JSON output → StructuredDraft
   │
─── STAGE 4: WRITE ────────────────────────────────────────────────────
   render → final markdown + structured JSON
   apply profile.brand_voice (tone, banned phrases, reading level)
   ensure citations for all external claims
   │
─── STAGE 5: SELF-REVIEW ──────────────────────────────────────────────
   score against agents/<phase>/<slug>/rubric.yaml
   if score < 0.7 OR banned phrase OR missing citations:
     auto_redo (max 3 iterations)
     if still failing after 3: escalate to user
   │
─── PUBLISH ───────────────────────────────────────────────────────────
   gtm-context-bus.put(<slug>.output.json, T2)
   gtm-handoff-validate.emit(...)
   gtm-policy-match → enqueue ApprovalRecord
   write runs/<run_id>.json
   audit: agent.run.complete + artifact.published + approval.requested
```

---

## 4. Question flow

When an agent needs input only the user can provide:

```
agent plan stage hits a missing required question
   │
   ▼
gtm-question-manager.resolve_inputs(question_set)
   │
   ├──► lookup loop per question:
   │      reusable_key match? (T1 → T2 → agent-specific)
   │      default value?
   │      → if found, fill in silently
   │      → if not, add to MISSING list
   │
   ▼
return NeedAnswers(missing=[...], already_answered={...})
   │
gtm-agent-run.plan() receives NeedAnswers
   │
   ▼
AskUserQuestion(missing[])  ← Claude Code surfaces questions in chat
   │
USER answers in the chat thread
   │
   ▼
gtm-question-manager.record_answers_batch(answers, run_id)
   │
   ├──► write tenants/<id>/cycles/<id>/agent_questions/<slug>/<qid>.json
   ├──► if question has reusable_key:
   │       write tenants/<id>/answers/<key>.json  (T1 promote)
   │     OR  tenants/<id>/cycles/<id>/answers/<key>.json  (T2 promote)
   ├──► audit: agent.question.answered
   │
   ▼
retry agent.plan()  ← now all required answers exist → ready
```

Result: the user is never asked the same `reusable_key` twice.

---

## 5. Approval flow

```
agent publishes artifact
   │
   ▼
gtm-policy-match SKILL
   │
   ├──► load governance/approval_policies.yaml
   │
   ├──► for each policy:
   │       check policy.when against artifact attrs:
   │         - artifact_type
   │         - content_text (regex / substring / from profile.frameworks)
   │         - author_voice_role
   │         - total_spend_usd > threshold
   │         - profile_flag (e.g. regulatory_review)
   │       AND across all non-null conditions
   │
   ├──► sort matched by priority ascending
   │
   ├──► union required roles across all matched policies
   │
   ├──► write approvals/<approval_id>.json
   │       decision: pending
   │       required_roles: [...]
   │       approvals_received: {}
   │
   ├──► audit: approval.requested
   │
   └──► (if blocks_downstream: true) the cycle pauses here

   ⋯ (some time later, user reviews) ⋯

USER: /gtm-approve <id> as=CMO comment="..."
   │
   ▼
gtm-approve SKILL
   │
   ├──► load approvals/<id>.json
   ├──► verify role ∈ required_roles
   ├──► approvals_received[CMO] = <iso_ts>
   │
   ├──► IF all required_roles in approvals_received:
   │       decision = approved
   │       decided_at = <iso>
   │       update handoff.approved_at + approval_record_id
   │   ELSE:
   │       decision = pending (still waiting on others)
   │
   ├──► audit: approval.decision
   │
   └──► if approved → downstream unblocked
                       gtm-cycle-start can resume

   ⋯ rejection path ⋯

USER: /gtm-reject <id> as=CMO comment="..."
   │
   ▼
gtm-reject SKILL
   │
   ├──► require non-empty comment (refuse if missing)
   ├──► decision = rejected
   ├──► revision_iteration += 1
   │
   ├──► IF revision_iteration >= max_iterations:
   │       audit: approval.escalated
   │       surface to user: escalate to <on_exceed role>
   │   ELSE:
   │       suggest: re-run <agent_slug> with this comment as redo_brief
   │
   └──► audit: approval.decision
```

---

## Cross-flow invariants

These hold across every flow. Skills that violate them are buggy.

1. **Every write to a file produces an audit_log entry.** No silent state changes.
2. **No skill reads outside its tenant's directory.** Tenant isolation is by path.
3. **No skill bypasses an approval gate.** The only way past `decision=pending` is
   `decision=approved`.
4. **No skill overwrites a prior artifact version.** Rename old → write new.
5. **No skill silently coerces schema versions.** If `v1` is required and `v2` is
   present, error out.
6. **No skill asks the user a question that has a reusable_key already answered.**
   QuestionManager checks first.

---

## File-write order (the safety dance)

When publishing an artifact, the skill writes in this order:

```
1. tenants/<id>/cycles/<id>/context_bus/<slug>.output.json   ← the payload
2. tenants/<id>/cycles/<id>/handoffs/<handoff_id>.json       ← the envelope
3. tenants/<id>/cycles/<id>/runs/<run_id>.json               ← run metadata
4. tenants/<id>/cycles/<id>/approvals/<approval_id>.json     ← approval enqueue
5. governance/audit_log.jsonl                                ← audit entries
```

If any step fails, prior steps remain (the system is forgiving). Subsequent reads
detect partial writes by the absence of a Handoff envelope.

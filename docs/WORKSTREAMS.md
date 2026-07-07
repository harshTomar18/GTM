# Workstreams

The Universal GTM OS is shipped in four sequential workstreams. Each is
independently usable — you don't have to wait for D to ship to use what A through
C deliver.

---

## Workstream A — Foundations (current)

**Status:** complete (Claude-Code-native pivot).

**Ships:**
- Folder structure + Claude Code skills + slash commands.
- 18 JSON schemas (TenantProfile, Handoff, PolicySet, AgentSpec, QuestionSet,
  + 13 artifact schemas).
- Governance: `approval_policies.yaml` + audit log conventions.
- Workflow: `cycle.yaml` declaring the 27-agent DAG.
- Example tenant + Vertical Pack template.
- Universal prompt fragments (`profile_header.md`, `cycle_header.md`).
- Five docs: ARCHITECTURE, HOW_IT_WORKS, DATA_FLOW, STATE_LAYOUT, ADDING_A_VERTICAL_PACK.
- 13 skills: tenant-init, validate-profile, cycle-start, agent-run, context-bus,
  question-manager, policy-match, handoff-validate, approve, reject, pending,
  dashboard, help.
- 9 slash commands wrapping the above.

**Does not ship:** any real Phase 1-5 agent. Until B lands, agents resolve to
"stubs" that exercise the framework but produce placeholder artifacts.

**Verify with:**
```
/gtm-validate-profile _example
/gtm-cycle-start tenant=_example cycle=2026-Q3   # dry-run; prints DAG
```

---

## Workstream B — Phase 1 + 2 Agents

**Status:** not started.

**Ships:** 10 concrete agents.

| Phase | Agent slug | Output schema |
|---|---|---|
| 1 | `phase1.brief_intake` | BriefIntake |
| 1 | `phase1.market_research` | CompetitorProfile[], MarketLandscape |
| 1 | `phase1.audience_intelligence` | PersonaSpec[], LanguageBank |
| 1 | `phase1.keyword_intent` | KeywordCluster[] |
| 1 | `phase1.research_synthesis` | ResearchDossier |
| 2 | `phase2.positioning` | PositioningStatement[] |
| 2 | `phase2.value_proposition` | ValuePropositionSet |
| 2 | `phase2.messaging_matrix` | MessagingMatrix |
| 2 | `phase2.content_pillars` | ContentPillarSet |
| 2 | `phase2.narrative_lock` | NarrativeLockDoc |

For each, ship:
- `agents/<phase>/<slug>/prompt.md` — agent prompt (Jinja-templated against profile)
- `agents/<phase>/<slug>/questions.yaml` — MVC gate questions
- `agents/<phase>/<slug>/agent_spec.yaml` — inputs, output schema, approval refs, KPIs
- `agents/<phase>/<slug>/rubric.yaml` — self-review scoring rubric
- `agents/<phase>/<slug>/README.md` — one-pager: mission, distinctive questions, KPIs

**Exit criterion:** a tenant can run a full Phase 1 → Phase 2 cycle end-to-end with
real (non-stub) artifacts, passing both phase exit gates (CMO + SalesLeader for the
research dossier, CMO + CEO + SalesLeader for the narrative lock).

---

## Workstream C — Phase 3 + 4 Agents

**Status:** not started.

**Ships:** 12 concrete agents — the asset-creation and distribution workhorses.

Phase 3 (Assets):
- `phase3.website_copy`
- `phase3.content_assets`
- `phase3.email_sequences`
- `phase3.social_content`
- `phase3.paid_ad_creative`
- `phase3.sales_enablement`

Phase 4 (Distribution):
- `phase4.channel_strategy`
- `phase4.campaign_calendar`
- `phase4.seo_activation`
- `phase4.paid_media`
- `phase4.outbound_partner`
- `phase4.community_activation`

Same five files per agent as Workstream B.

**Also ships:**
- MCP integration skill stubs for HubSpot, Salesforce, GA4, Ahrefs, LinkedIn,
  Notion, Slack, Google Drive, GitHub (one-line readers, actual integrations
  added per-tenant).
- The `experiment_engine` skill (variant assignment, basic stats).
- Brand-impacting policy enforcement gets fully exercised here.

**Exit criterion:** a tenant can run a full cycle from brief intake through a
launched 90-day campaign calendar.

---

## Workstream D — Phase 5 + Enterprise Layer

**Status:** not started.

**Ships:**

Phase 5 agents:
- `phase5.measurement` (KPI framework + dashboard spec)
- `phase5.experiment_review`
- `phase5.executive_brief` (Markdown → PDF/PPTX via Anthropic skills)
- `phase5.competitive_pulse` (continuous signal emitter)
- `phase5.iteration_planner`

Shared services (Workstream D's headline deliverable):
- **Signal Bus** — file-based pub/sub for incoming events (intent, competitor,
  KPI). `tenants/<id>/signals/<id>.json`. Reactive dispatcher matches signals to
  agent subscriptions.
- **Experimentation Engine** — variant assignment, sample-size tracking, winner
  declaration.
- **Attribution Engine** — touchpoint ingestion + multi-touch models
  (last-touch, linear, position-based, data-driven if data is sufficient).
- **Brand Validator** — voice rubric (5-axis Likert), banned-phrase regex,
  reading-level check, persona-tone alignment.
- **Claim Checker** — every numeric/named claim must trace to a citation in the
  artifact's sources field.
- **Regulatory Lint** — per-jurisdiction rule set; jurisdiction-specific disclaimers.
- **PII Scanner** — block any artifact containing names/emails/phone numbers
  beyond explicit allow-listed tenant employees.
- **Localization** — DeepL API + glossary YAML + per-locale brand voice override.

Governance:
- Prompt registry CI (a `_registry.yaml`-aware skill that fails any agent run
  using an unpinned prompt).
- Eval harness — golden sets per agent, rubric scoring, drift detection.

**Exit criterion:** the system enforces 80% of the blueprint's risk-management
framework automatically. Mid-cycle reactive inserts work. Multi-tenant operation
is documented.

---

## Workstream sizing (estimated relative effort)

| Workstream | Relative size | What breaks if skipped |
|---|---|---|
| A. Foundations | M | nothing else works |
| B. Phase 1 + 2 | L | no foundation context for Phase 3+ |
| C. Phase 3 + 4 | XL | the system has strategy but can't execute campaigns |
| D. Phase 5 + Enterprise | XL | mid-market works; enterprise can't adopt (no ABM rigor, no attribution defense, no regulatory governance) |

A → B → C can largely overlap if there's a team. D depends on C being usable.

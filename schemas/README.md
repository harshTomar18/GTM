# Schemas — Universal Artifact Contracts

This directory defines the typed contracts that agents use to pass work to each other.
There's no runtime validator in this architecture (no Python). Instead, agents are
instructed (via their prompts) to produce output conforming to the relevant schema,
and downstream agents read both the schema and the upstream artifact when consuming.

## Format

Each schema is a JSON Schema file (`*.schema.json`) plus a one-line summary in the
table below. Versions follow semver: a change to `schema_version` major (`v1` → `v2`)
is a breaking change requiring downstream agents to upgrade; minor/patch bumps are
additive.

## Framework Schemas

| Schema | Purpose |
|---|---|
| `tenant_profile.schema.json` | The root tenant configuration (industry, ICP, frameworks, brand voice, approval roles, tech stack, operating calendar) |
| `handoff.schema.json` | Inter-agent envelope (artifact_ref, schema_version, quality_signals, approval state) |
| `policies.schema.json` | Approval policy set loaded from `governance/approval_policies.yaml` |
| `agent_spec.schema.json` | Declarative metadata for an agent (inputs, output schema, approval refs, KPIs, SLA) |
| `question_set.schema.json` | Per-agent `questions.yaml` shape (id, prompt, type, reusable_key, etc.) |

## Artifact Schemas (the 16 from the blueprint)

| # | Schema | Owning agent | Notes |
|---|---|---|---|
| 1 | `tenant_profile.schema.json` | — | (also a framework schema) |
| 2 | `artifacts/brief_intake.schema.json` | `phase1.brief_intake` | Campaign brief + research-question list |
| 3 | `artifacts/research_dossier.schema.json` | `phase1.research_synthesis` | 7-section synthesis |
| 4 | `artifacts/persona_spec.schema.json` | `phase1.audience_intelligence` | One evidence-based persona |
| 5 | `artifacts/competitor_profile.schema.json` | `phase1.market_research` | Per-competitor card |
| 6 | `artifacts/keyword_cluster.schema.json` | `phase1.keyword_intent` | One keyword cluster |
| 7 | `artifacts/positioning_statement.schema.json` | `phase2.positioning` | Geoffrey Moore / April Dunford frame |
| 8 | `artifacts/messaging_matrix.schema.json` | `phase2.messaging_matrix` | Persona × channel × funnel-stage grid |
| 9 | `artifacts/content_brief.schema.json` | `phase3.content_assets` | One asset spec |
| 10 | `artifacts/channel_plan.schema.json` | `phase4.channel_strategy` | Channel × audience × budget × KPI |
| 11 | `artifacts/campaign_calendar.schema.json` | `phase4.campaign_calendar` | Time-phased plan |
| 12 | `artifacts/kpi_framework.schema.json` | `phase5.measurement` | KPI tree |
| 13 | `artifacts/approval_record.schema.json` | (system) | Approval state |
| 14 | `handoff.schema.json` | (system) | Inter-agent envelope |
| 15 | `artifacts/experiment.schema.json` | (system) | A/B / bandit definition + state |
| 16 | `artifacts/attribution_event.schema.json` | (system) | One touchpoint |
| 17 | `artifacts/value_proposition_set.schema.json` | `phase2.value_proposition` | Core + per-persona value props + proof points |
| 18 | `artifacts/content_pillar_set.schema.json` | `phase2.content_pillars` | 3-5 pillars + topic clusters |
| 19 | `artifacts/narrative_lock_doc.schema.json` | `phase2.narrative_lock` | Phase 2 exit-gate artifact; frozen messaging architecture |
| 20 | `artifacts/website_copy_pack.schema.json` | `phase3.website_copy` | Homepage + solution + landing copy with meta |
| 21 | `artifacts/content_asset_pack.schema.json` | `phase3.content_assets` | Flagship articles, case studies, one-pagers |
| 22 | `artifacts/email_sequence_pack.schema.json` | `phase3.email_sequences` | Nurture / prospecting / lifecycle / re-engagement |
| 23 | `artifacts/social_content_pack.schema.json` | `phase3.social_content` | Platform-native posts and series |
| 24 | `artifacts/paid_ad_creative_pack.schema.json` | `phase3.paid_ad_creative` | Ad-unit copy + creative direction per channel |
| 25 | `artifacts/sales_enablement_pack.schema.json` | `phase3.sales_enablement` | Battlecards, decks, objections, talk tracks |
| 26 | `artifacts/seo_activation_pack.schema.json` | `phase4.seo_activation` | On-page, internal linking, schema, AI Overview |
| 27 | `artifacts/paid_media_setup_pack.schema.json` | `phase4.paid_media` | Platform-ready campaigns + budgets + tracking |
| 28 | `artifacts/outbound_partner_pack.schema.json` | `phase4.outbound_partner` | Named-account outbound + partner co-sell |
| 29 | `artifacts/community_activation_pack.schema.json` | `phase4.community_activation` | Owned/earned/adjacent community programs |

## Versioning

When an agent produces an artifact, its prompt must include the schema_version, e.g.:

```json
{
  "schema_version": "PersonaSpec:v1.0.0",
  "persona_id": "p1",
  ...
}
```

Receiving agents declare what they accept (in their `agent_spec.yaml`):

```yaml
inputs:
  - key: phase1.audience_intelligence.primary_persona
    schema_version: "PersonaSpec:v1"
    required: true
```

The compatibility rule: receiver and producer must share the same `name:vMAJOR`. A
`v2` major change means the producer broke the contract; downstream agents must be
updated.

## Where these are validated

In this no-Python architecture, validation happens at three points:

1. **Agent prompt-time:** the agent's prompt template includes the relevant JSON
   schema and instructs the LLM to produce conforming JSON.
2. **Handoff-write-time:** the writer slash-command does a structural check (the
   produced JSON must contain `schema_version` and the top-level required fields).
3. **Approval-time:** the brand validator + claim checker + regulatory linter (built
   in Workstream D as Claude Code skills) check semantic constraints.

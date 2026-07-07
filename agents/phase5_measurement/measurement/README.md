# phase5.measurement — KPI Framework & Dashboard Spec

## Mission

Define and instrument the cycle's success metrics, attribution model, and dashboard spec. Produce a `KPIFramework:v1.0.0` that downstream agents and the executive brief consume.

---

## Inputs

| ID | Source Agent | Schema | Required | Approval Required |
|----|-------------|--------|----------|-------------------|
| `campaign_calendar` | `phase4.campaign_calendar` | `CampaignCalendar:v1` | Yes | Yes (approved) |
| `research_dossier` | `phase1.research_synthesis` | `ResearchDossier:v1` | Yes | No |
| `brief_intake` | `phase1.brief_intake` | `BriefIntake:v1` | Yes | No |

**Profile keys consumed:** `profile.tech_stack`, `profile.operating_calendar`

---

## Distinctive Questions

| ID | Question | Required | Reusable Key | Type |
|----|----------|----------|-------------|------|
| `q_primary_kpi` | What is the single north-star KPI for this cycle? | Required | `cycle.kpi.north_star` | Single-select |
| `q_attribution_model` | Which attribution model should be used? | Required | `cycle.attribution.model` | Single-select |
| `q_cohort_definition` | How should a marketing-influenced opportunity be defined? | Required | `cycle.attribution.cohort_definition` | Free text |
| `q_dashboard_tooling` | Which BI/dashboard tool will be used? | Required | `tenant.tech_stack.bi_tool` | Single-select |
| `q_baseline_available` | Are prior-cycle baseline metrics available? | Optional | `cycle.measurement.has_baseline` | Boolean |
| `q_reporting_cadence` | Reporting cadence for GTM leaders? | Optional | `cycle.measurement.reporting_cadence` | Single-select (default: weekly) |

---

## Output Schema

**Schema:** `KPIFramework:v1.0.0`
**Stored as:** `phase5.measurement.output`

### Top-level structure

```
KPIFramework
├── north_star              — single north-star metric with target + source_system
├── input_metrics[]         — ≥3 lagging/pipeline metrics tied to source systems
├── leading_indicators[]    — ≥5 early-signal metrics, one per channel minimum
├── attribution_config      — model, rationale, cohort_definition, lookback window
├── dashboard_spec          — BI tool, datasources (per channel), sections, refresh cadence
├── baseline                — prior-cycle reference or absence note
└── rubric_score            — self-review scores and pass/fail
```

---

## Approval Gate

| Policy | Required Approvers | Rationale |
|--------|--------------------|-----------|
| `brand_impacting` | CMO + CFO | KPI framework drives executive reporting; must be aligned to financial targets before downstream consumption |

---

## Quality KPIs

| KPI ID | Description | Target |
|--------|-------------|--------|
| `dashboard_freshness` | Dashboard spec has `datasource_ids` for all channels in the channel plan | Ratio = 1.0 |
| `kpi_tree_depth` | north_star + ≥3 input_metrics + ≥5 leading_indicators all present | `true` |
| `attribution_model_declared` | `attribution_model` field is populated | `true` |
| `cohort_definition_present` | `cohort_definition` is a non-empty, specific string | `true` |

---

## SLA

| Parameter | Limit |
|-----------|-------|
| Max tokens | 24,000 |
| Max latency | 480 seconds |
| Max cost | $2.50 USD |

---

## Downstream Agents

Agents that consume `phase5.measurement.output` (`KPIFramework:v1.0.0`):

| Agent | How it uses KPIFramework |
|-------|--------------------------|
| `phase5.executive_brief` | Pulls north_star, input_metrics, and rubric_score into the leadership summary |
| `phase5.cycle_retrospective` | Compares actuals against targets in input_metrics and leading_indicators |
| `phase5.experiment_engine` | Uses leading_indicators as hypothesis metrics for A/B and multivariate tests |
| `phase5.optimization_signal` | Monitors leading_indicator thresholds to trigger mid-cycle reallocation signals |

---

## Failure Modes

| Failure ID | Trigger Condition | Action |
|------------|-------------------|--------|
| `kpi_tree_incomplete` | `north_star` is null or `input_metrics` is empty | Redo |
| `attribution_model_missing` | `attribution_config.model` is null or unrecognized | Redo |
| `channel_coverage_gap` | A channel in `campaign_calendar.channel_plan` has no `leading_indicator` entry | Redo |

---

## What Is Automated vs. Human Review

### Fully Automated
- Rendering the Jinja prompt against the TenantProfile and upstream input artifacts
- Generating the KPIFramework JSON (north_star, input_metrics, leading_indicators, attribution_config, dashboard_spec)
- Self-review scoring against the rubric (up to 3 auto-redo cycles)
- Failure mode detection and redo triggering
- Writing `phase5.measurement.output` to the context bus

### Human Review Required
- **CMO approval:** Validates that the north_star and input_metrics reflect the stated GTM objective and company strategy
- **CFO approval:** Validates that pipeline targets and attribution model are consistent with financial reporting standards
- **Final dashboard build:** The dashboard_spec is a specification document — a BI engineer or analyst must implement it in the chosen tool using the datasource and section definitions produced here
- **Baseline population:** If `q_baseline_available` is true, a human must populate prior-cycle actuals into the dashboard before the cycle begins

# Python Reference (Archived)

> **Status:** Archived. Not part of the active Universal GTM OS runtime.

This directory contains an earlier Python implementation of the framework's core
plumbing — Pydantic schemas, SQLite state, an Orchestrator class, a typer CLI, and
pytest tests. It was built before pivoting to a **Claude-Code-native, no-Python**
architecture in which Claude itself is the runtime.

## Why we kept it

It's useful as:

1. A **typed reference** for what the universal schemas should contain.
2. A worked example of the orchestration algorithm (DAG compilation, topological
   batching, approval-gate state machine).
3. A starting point if a future deployment needs a programmatic API surface for
   embedding the GTM OS in another system.

## Why we're not using it

It required Python 3.11+ to be installed on the host machine. The Claude-Code-native
architecture (see the parent `README.md` and `docs/HOW_IT_WORKS.md`) has zero runtime
dependencies — every flow is driven by Claude reading markdown/YAML/JSON files and
asking the user for input via the chat interface.

## What's here

| File / Dir | Purpose |
|---|---|
| `core/schemas/*.py` | Pydantic models for TenantProfile, Handoff, 16 artifact schemas, AgentSpec, Question, PolicySet |
| `core/state.py` | SQLite schema and DAO (tenants, cycles, agents_runs, context_bus, approvals, audit_log_index, signals, experiments, attribution_events) |
| `core/context_bus.py` | Typed pub/sub with T1–T4 memory tiers, schema-version validation, dependency checks |
| `core/question_manager.py` | MVC gate + ConversationStore with reusable_key promotion |
| `core/approval_engine.py` | Policy-driven approval state machine + audit-log writer |
| `core/prompt_renderer.py` | Jinja-templated 3-block cache builder |
| `core/llm_client.py` | Anthropic SDK wrapper with dry-run + cost telemetry |
| `core/base_agent.py` | Five-stage pipeline base class |
| `core/orchestrator.py` | DAG compiler + execution loop + AgentRegistry |
| `core/tenant_loader.py` | TenantProfile + VerticalPack deep-merge loader |
| `gtm.py` | typer CLI (cycle start, agent run, approve, dashboard, validate-profile, tenant init) |
| `pyproject.toml` | Dependencies, ruff/black/mypy config, build metadata |
| `tests/` | pytest suite — schemas, state, ContextBus, QuestionManager, ApprovalEngine, Orchestrator dry-run, PromptRenderer, LLMClient |

## If you ever want to use this

```bash
cd _python_reference
pip install -e ".[dev]"
pytest
python gtm.py validate-profile ../tenants/_example/tenant_profile.yaml
python gtm.py cycle start --tenant _example --cycle 2026-Q3 --dry-run
```

(You'd need to update the file paths in `gtm.py` to point at the parent directory's
`tenants/`, `workflows/`, `governance/`, and `prompts/`.)

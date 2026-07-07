"""Orchestrator dry-run + DAG compilation tests."""

from __future__ import annotations

from core.orchestrator import (
    AgentRegistry,
    Orchestrator,
    OrchestratorServices,
    compile_dag,
    load_cycle_spec,
)


def test_compile_dag(repo_root):
    spec, sha = load_cycle_spec(repo_root / "workflows" / "cycle.yaml")
    dag = compile_dag(spec)
    # Sanity: 27 agents declared.
    assert len(dag.nodes) == 27
    # phase1.brief_intake is in first batch
    assert dag.execution_order[0] == ["phase1.brief_intake"]
    # phase1.research_synthesis depends on three siblings
    rs = dag.nodes["phase1.research_synthesis"]
    assert set(rs.depends_on) == {
        "phase1.market_research",
        "phase1.audience_intelligence",
        "phase1.keyword_intent",
    }


def test_dag_text_diagram(repo_root):
    spec, _ = load_cycle_spec(repo_root / "workflows" / "cycle.yaml")
    dag = compile_dag(spec)
    text = dag.to_text_diagram()
    assert "Phase 1" in text
    assert "phase1.brief_intake" in text
    assert "Exit gate" in text


def test_dry_run_cycle(
    state, context_bus, question_manager, prompt_renderer, llm_dry, approval_engine, example_profile, repo_root
):
    services = OrchestratorServices(
        state=state,
        context_bus=context_bus,
        question_manager=question_manager,
        prompt_renderer=prompt_renderer,
        llm_client=llm_dry,
        approval_engine=approval_engine,
    )
    orch = Orchestrator(
        services=services,
        cycle_spec_path=repo_root / "workflows" / "cycle.yaml",
        registry=AgentRegistry(allow_stubs=True),
    )
    report = orch.start_cycle(profile=example_profile, cycle_id="2026-Q3", dry_run=True)
    assert report.dry_run
    assert report.aborted_at is None
    assert len(report.dag.nodes) == 27


def test_agent_registry_stub_fallback():
    reg = AgentRegistry(allow_stubs=True)
    cls = reg.load("phase1.brief_intake")
    assert cls is not None
    assert "phase1_brief_intake" in cls.__name__.lower() or "stub" in cls.__name__.lower()

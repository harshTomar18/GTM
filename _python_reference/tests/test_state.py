"""State (SQLite) layer tests."""

from __future__ import annotations


def test_schema_created(state):
    with state.connection() as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
    tables = {r["name"] for r in rows}
    expected = {
        "tenants", "cycles", "agents_runs", "agent_questions",
        "context_bus", "handoffs", "approvals", "signals",
        "experiments", "attribution_events", "audit_log_index", "schema_meta",
    }
    assert expected.issubset(tables), f"Missing tables: {expected - tables}"


def test_upsert_tenant_and_cycle(state):
    state.upsert_tenant("t1", "/path/to/profile.yaml")
    state.start_cycle("t1", "2026-Q3", cycle_yaml_sha="abc123")
    cycle = state.get_cycle("t1", "2026-Q3")
    assert cycle is not None
    assert cycle["status"] == "running"
    assert cycle["cycle_yaml_sha"] == "abc123"


def test_record_and_complete_run(state):
    state.upsert_tenant("t1", "/p")
    state.start_cycle("t1", "2026-Q3", None)
    state.record_run(
        run_id="r1", tenant_id="t1", cycle_id="2026-Q3",
        agent_slug="phase1.brief_intake", status="running",
    )
    state.complete_run(
        run_id="r1", status="completed",
        tokens_in=1000, tokens_out=200, cost_usd=0.05, latency_ms=1234,
    )
    run = state.get_run("r1")
    assert run is not None
    assert run["status"] == "completed"
    assert run["tokens_in"] == 1000
    assert run["cost_usd"] == 0.05


def test_audit_event_index(state):
    seq = state.index_audit_event(
        ts="2026-05-22T10:00:00",
        event="approval.requested",
        actor="system",
        subject_type="artifact",
        subject_id="phase1.brief_intake.output",
        tenant_id="t1",
    )
    assert seq > 0

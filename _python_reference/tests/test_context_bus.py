"""ContextBus tests — put/get/promote/schema validation/dependency checks."""

from __future__ import annotations

import pytest

from core.context_bus import HandoffMissing, SchemaMismatch, schema_major, schema_name


def test_schema_version_parsers():
    assert schema_major("PersonaSpec:v2.3.4") == 2
    assert schema_major("PersonaSpec:1.0.0") == 1
    assert schema_name("PersonaSpec:v2.3.4") == "PersonaSpec"


def test_put_and_get_t2(context_bus):
    entry = context_bus.put(
        key="phase1.brief_intake.output",
        value={"campaign_id": "c1", "schema_version": "BriefIntake:v1.0.0"},
        tenant_id="t1",
        tier="T2",
        cycle_id="2026-Q3",
        written_by_agent="phase1.brief_intake",
    )
    assert entry.tier == "T2"
    got = context_bus.get(
        key="phase1.brief_intake.output",
        tenant_id="t1",
        cycle_id="2026-Q3",
        required_schema_version="BriefIntake:v1",
    )
    assert got.payload["campaign_id"] == "c1"


def test_schema_mismatch_raises(context_bus):
    context_bus.put(
        key="k",
        value={"schema_version": "BriefIntake:v2.0.0", "campaign_id": "c2"},
        tenant_id="t1",
        tier="T2",
        cycle_id="2026-Q3",
    )
    with pytest.raises(SchemaMismatch):
        context_bus.get(
            key="k", tenant_id="t1", cycle_id="2026-Q3",
            required_schema_version="BriefIntake:v1",
        )


def test_missing_raises(context_bus):
    with pytest.raises(HandoffMissing):
        context_bus.get(key="nope", tenant_id="t1", cycle_id="2026-Q3")


def test_dependency_validation(context_bus):
    context_bus.put(
        key="phase1.brief_intake.output",
        value={"schema_version": "BriefIntake:v1.0.0"},
        tenant_id="t1", tier="T2", cycle_id="2026-Q3",
    )
    problems = context_bus.validate_dependencies(
        tenant_id="t1", cycle_id="2026-Q3",
        required=[("phase1.brief_intake.output", "BriefIntake:v1", False),
                  ("phase1.audience_intelligence.primary_persona", "PersonaSpec:v1", False)],
    )
    assert any("missing:phase1.audience_intelligence" in p for p in problems)
    assert not any("missing:phase1.brief_intake" in p for p in problems)


def test_promote_creates_t2(context_bus):
    entry = context_bus.promote(
        from_value="land 5 ICPs",
        key="cycle.objective.primary",
        tenant_id="t1",
        to_tier="T2",
        cycle_id="2026-Q3",
        source_agent="qm",
    )
    assert entry.payload["value"] == "land 5 ICPs"
    got = context_bus.get(key="cycle.objective.primary", tenant_id="t1", cycle_id="2026-Q3")
    assert got.payload["value"] == "land 5 ICPs"


def test_subscriptions_match(context_bus):
    context_bus.subscribe("competitor.*", "phase5.competitive_pulse")
    assert "phase5.competitive_pulse" in context_bus.matching_subscribers("competitor.launch")
    assert context_bus.matching_subscribers("unrelated.key") == []


def test_require_approved(context_bus):
    context_bus.put(key="art", value={"schema_version": "X:v1"},
                    tenant_id="t1", tier="T2", cycle_id="2026-Q3")
    with pytest.raises(HandoffMissing):
        context_bus.get(key="art", tenant_id="t1", cycle_id="2026-Q3",
                        require_approved=True)

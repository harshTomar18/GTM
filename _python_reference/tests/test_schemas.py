"""Schema smoke tests — ensure every artifact schema is instantiable."""

from __future__ import annotations

from datetime import date, datetime

from core.schemas import (
    AgentSpec,
    Answer,
    ApprovalRecord,
    AttributionEvent,
    BriefIntake,
    CampaignCalendar,
    ChannelPlan,
    CompetitorProfile,
    ContentBrief,
    DossierSection,
    Experiment,
    Handoff,
    InputRef,
    KPIFramework,
    KPISpec,
    KeywordCluster,
    MessagingMatrix,
    PersonaSpec,
    PolicySet,
    PositioningStatement,
    QualitySignals,
    Question,
    QuestionSet,
    ResearchDossier,
    TenantProfile,
)
from core.schemas.artifacts import (
    CalendarItem,
    ChannelAllocation,
    FunnelStage,
    Keyword,
    MessagingCell,
    Priority,
    ResearchQuestionBucket,
)


def test_tenant_profile_minimal():
    p = TenantProfile(
        profile_id="t-test",
        company={"legal_name": "Acme", "brand_name": "Acme"},
        industry={"primary": "saas"},
    )
    assert p.primary_motion() == "enterprise_abm"
    assert p.primary_icp() is None
    assert not p.has_regulatory_review()


def test_handoff_schema_major():
    h = Handoff(
        from_agent="phase1.brief_intake",
        cycle_id="2026-Q3",
        tenant_id="t-test",
        artifact_ref="phase1.brief_intake.output",
        schema_version="BriefIntake:v2.1.0",
    )
    assert h.schema_major() == 2
    assert not h.is_approved()


def test_brief_intake():
    b = BriefIntake(
        campaign_id="c1",
        product_summary="x",
        primary_buyer="CFO",
        business_objective="land 5 ICPs",
        timeline="Q3",
    )
    assert b.schema_version.startswith("BriefIntake:")


def test_research_dossier_full():
    section = lambda title: DossierSection(title=title, body_markdown="...")
    d = ResearchDossier(
        campaign_brief_summary=section("Brief"),
        market_context=section("Market"),
        competitive_landscape=section("Competitive"),
        audience_intelligence=section("Audience"),
        keyword_content_intelligence=section("Keywords"),
        strategic_recommendations=section("Strategy"),
        open_questions_assumptions=section("Open"),
    )
    assert d.pressure_test_passed is False


def test_persona_keyword_messaging():
    p = PersonaSpec(persona_id="p1", name="Sample", title="VP Finance")
    k = KeywordCluster(cluster_id="c1", name="finance ops", intent=FunnelStage.MOFU,
                       keywords=[Keyword(term="month-end close")])
    m = MessagingMatrix(cells=[
        MessagingCell(persona_id="p1", channel="linkedin",
                      funnel_stage=FunnelStage.TOFU, message="...")
    ])
    assert p.name == "Sample"
    assert k.priority == Priority.P2
    assert len(m.cells) == 1


def test_channel_calendar_kpis():
    cp = ChannelPlan(cycle_id="2026-Q3", total_budget_usd=100_000,
                     allocations=[ChannelAllocation(
                         channel="linkedin_ads", audience="ICP A",
                         budget_pct=0.4, primary_kpi="CPL")])
    cal = CampaignCalendar(cycle_id="2026-Q3",
                           items=[CalendarItem(item_id="i1", asset_ref="x",
                                              channel="linkedin",
                                              scheduled_date=date(2026, 8, 1),
                                              owner="cmo")])
    k = KPIFramework(north_star=KPISpec(id="ns", name="Pipeline", target=1_000_000,
                                         unit="USD", source="hubspot"))
    assert sum(a.budget_pct for a in cp.allocations) == 0.4
    assert cal.items[0].owner == "cmo"
    assert k.north_star.unit == "USD"


def test_experiment_attribution():
    e = Experiment(experiment_id="e1", artifact_ref="phase3.website_copy.hero")
    a = AttributionEvent(timestamp=datetime.utcnow(), source="ga4",
                         channel="organic", touchpoint_type="page_view")
    assert e.status == "draft"
    assert a.weight == 1.0


def test_approval_record_default():
    ar = ApprovalRecord(artifact_ref="x", artifact_version="1.0.0")
    assert ar.decision == "pending"


def test_agent_spec_and_questions():
    spec = AgentSpec(
        slug="phase1.brief_intake",
        phase=1,
        stage=1,
        mission="capture brief",
        output_schema="BriefIntake:v1.0.0",
        inputs=[InputRef(key="profile.identity", schema_version="TenantProfile:v2")],
    )
    qs = QuestionSet(agent_slug="phase1.brief_intake", questions=[
        Question(id="q1", prompt="What is the goal?", required_for="plan",
                 reusable_key="cycle.objective.primary")
    ])
    a = Answer(question_id="q1", agent_slug="phase1.brief_intake", answer_value="x")
    assert spec.model_plan.startswith("claude-")
    assert qs.questions[0].reusable_key == "cycle.objective.primary"
    assert a.source == "user"

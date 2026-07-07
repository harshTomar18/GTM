"""Universal artifact schemas.

These 14 schemas form the typed contract layer between agents. Each artifact carries
`schema_version` so receivers can validate compatibility.

Schemas are intentionally minimal in Workstream A — they capture the shape and required
fields. Workstreams B/C/D will extend specific schemas as their owning agents are built.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

SCHEMA_VERSION = "v1.0.0"


class FunnelStage(str, Enum):
    TOFU = "TOFU"
    MOFU = "MOFU"
    BOFU = "BOFU"
    RETENTION = "RETENTION"
    EXPANSION = "EXPANSION"


class Priority(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


# ---------------------------------------------------------------------------
# 2. BriefIntake
# ---------------------------------------------------------------------------
class ResearchQuestionBucket(BaseModel):
    market: list[str] = Field(default_factory=list)
    competitor: list[str] = Field(default_factory=list)
    audience: list[str] = Field(default_factory=list)
    language: list[str] = Field(default_factory=list)


class BriefIntake(BaseModel):
    schema_version: str = f"BriefIntake:{SCHEMA_VERSION}"
    campaign_id: str
    product_summary: str
    primary_buyer: str
    primary_user: str | None = None
    business_objective: str
    timeline: str
    budget_signal: str | None = None
    known_facts: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    known_competitors: list[str] = Field(default_factory=list)
    why_we_win: list[str] = Field(default_factory=list)
    why_we_lose: list[str] = Field(default_factory=list)
    research_questions: ResearchQuestionBucket = Field(default_factory=ResearchQuestionBucket)


# ---------------------------------------------------------------------------
# 3. ResearchDossier
# ---------------------------------------------------------------------------
class DossierSection(BaseModel):
    title: str
    body_markdown: str
    citations: list[str] = Field(default_factory=list)


class ResearchDossier(BaseModel):
    schema_version: str = f"ResearchDossier:{SCHEMA_VERSION}"
    campaign_brief_summary: DossierSection
    market_context: DossierSection
    competitive_landscape: DossierSection
    audience_intelligence: DossierSection
    keyword_content_intelligence: DossierSection
    strategic_recommendations: DossierSection
    open_questions_assumptions: DossierSection
    pressure_test_passed: bool = False


# ---------------------------------------------------------------------------
# 4. PersonaSpec
# ---------------------------------------------------------------------------
class VoiceOfCustomer(BaseModel):
    quote: str
    source: str
    sentiment: Literal["pain", "gain", "fear", "neutral"] = "neutral"


class PersonaSpec(BaseModel):
    schema_version: str = f"PersonaSpec:{SCHEMA_VERSION}"
    persona_id: str
    name: str
    title: str
    company_size: str | None = None
    seniority: str | None = None
    day_in_life: str = ""
    measured_on: list[str] = Field(default_factory=list)
    decisions_owned: list[str] = Field(default_factory=list)
    decisions_influenced: list[str] = Field(default_factory=list)
    pain_points: list[VoiceOfCustomer] = Field(default_factory=list)
    triggers: list[str] = Field(default_factory=list)
    research_paths: list[str] = Field(default_factory=list)
    buying_committee_role: str | None = None
    objections: list[str] = Field(default_factory=list)
    language_phrases: list[VoiceOfCustomer] = Field(default_factory=list)
    watering_holes: list[str] = Field(default_factory=list)
    proof_required: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 5. CompetitorProfile
# ---------------------------------------------------------------------------
class CompetitorProfile(BaseModel):
    schema_version: str = f"CompetitorProfile:{SCHEMA_VERSION}"
    name: str
    url: str | None = None
    positioning: str = ""
    target_icp: str = ""
    key_differentiator: str = ""
    pricing_model: str | None = None
    weaknesses: list[str] = Field(default_factory=list)
    praise_points: list[str] = Field(default_factory=list)
    review_rating: float | None = None
    review_source: str | None = None
    recent_news: list[str] = Field(default_factory=list)
    our_differentiation_angle: str = ""


# ---------------------------------------------------------------------------
# 6. KeywordCluster
# ---------------------------------------------------------------------------
class Keyword(BaseModel):
    term: str
    volume: int | None = None
    difficulty: int | None = None
    intent: FunnelStage | None = None


class KeywordCluster(BaseModel):
    schema_version: str = f"KeywordCluster:{SCHEMA_VERSION}"
    cluster_id: str
    name: str
    intent: FunnelStage
    priority: Priority = Priority.P2
    keywords: list[Keyword] = Field(default_factory=list)
    recommended_content_type: str | None = None
    serp_features: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 7. PositioningStatement
# ---------------------------------------------------------------------------
class PositioningStatement(BaseModel):
    schema_version: str = f"PositioningStatement:{SCHEMA_VERSION}"
    statement: str
    category: str
    target_audience: str
    primary_value: str
    competing_alternatives: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    rationale: str = ""
    variant_label: str = "primary"


# ---------------------------------------------------------------------------
# 8. MessagingMatrix
# ---------------------------------------------------------------------------
class MessagingCell(BaseModel):
    persona_id: str
    channel: str
    funnel_stage: FunnelStage
    message: str
    proof_points: list[str] = Field(default_factory=list)


class MessagingMatrix(BaseModel):
    schema_version: str = f"MessagingMatrix:{SCHEMA_VERSION}"
    cells: list[MessagingCell] = Field(default_factory=list)
    taglines: list[str] = Field(default_factory=list)
    differentiators: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 9. ContentBrief
# ---------------------------------------------------------------------------
class ContentBrief(BaseModel):
    schema_version: str = f"ContentBrief:{SCHEMA_VERSION}"
    brief_id: str
    title: str
    asset_type: str
    persona_id: str
    funnel_stage: FunnelStage
    outline: list[str] = Field(default_factory=list)
    primary_keyword: str | None = None
    secondary_keywords: list[str] = Field(default_factory=list)
    word_count_target: int | None = None
    sources_required: int = 3
    voice_notes: str = ""
    success_metric: str = ""
    cta: str = ""


# ---------------------------------------------------------------------------
# 10. ChannelPlan
# ---------------------------------------------------------------------------
class ChannelAllocation(BaseModel):
    channel: str
    audience: str
    budget_pct: float = Field(ge=0.0, le=1.0)
    budget_usd: float = 0.0
    primary_kpi: str
    test_hypothesis: str | None = None
    time_horizon_days: int = 90


class ChannelPlan(BaseModel):
    schema_version: str = f"ChannelPlan:{SCHEMA_VERSION}"
    cycle_id: str
    total_budget_usd: float
    allocations: list[ChannelAllocation] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 11. CampaignCalendar
# ---------------------------------------------------------------------------
class CalendarItem(BaseModel):
    item_id: str
    asset_ref: str
    channel: str
    scheduled_date: date
    owner: str
    depends_on: list[str] = Field(default_factory=list)


class CampaignCalendar(BaseModel):
    schema_version: str = f"CampaignCalendar:{SCHEMA_VERSION}"
    cycle_id: str
    items: list[CalendarItem] = Field(default_factory=list)
    risk_callouts: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 12. KPIFramework
# ---------------------------------------------------------------------------
class KPISpec(BaseModel):
    id: str
    name: str
    target: float
    unit: str
    source: str
    cadence: str = "weekly"
    parent_kpi: str | None = None


class KPIFramework(BaseModel):
    schema_version: str = f"KPIFramework:{SCHEMA_VERSION}"
    north_star: KPISpec
    input_metrics: list[KPISpec] = Field(default_factory=list)
    leading_indicators: list[KPISpec] = Field(default_factory=list)
    system_health: list[KPISpec] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 13. ApprovalRecord
# ---------------------------------------------------------------------------
class ApprovalRecord(BaseModel):
    schema_version: str = f"ApprovalRecord:{SCHEMA_VERSION}"
    approval_id: UUID = Field(default_factory=uuid4)
    artifact_ref: str
    artifact_version: str
    policies_matched: list[str] = Field(default_factory=list)
    required_roles: list[str] = Field(default_factory=list)
    approvals_received: dict[str, datetime] = Field(default_factory=dict)
    decision: Literal["pending", "approved", "rejected", "revisions_requested"] = "pending"
    decided_at: datetime | None = None
    comment: str | None = None


# ---------------------------------------------------------------------------
# 15. Experiment
# ---------------------------------------------------------------------------
class ExperimentArm(BaseModel):
    arm_id: str
    label: str
    variant_payload: dict[str, Any] = Field(default_factory=dict)
    impressions: int = 0
    conversions: int = 0


class Experiment(BaseModel):
    schema_version: str = f"Experiment:{SCHEMA_VERSION}"
    experiment_id: str
    artifact_ref: str
    arms: list[ExperimentArm] = Field(default_factory=list)
    assignment_strategy: Literal["ab", "multivariate", "bandit_thompson"] = "ab"
    sample_size_target: int = 1000
    success_metric: str = "conversion_rate"
    status: Literal["draft", "running", "concluded", "rolled_out"] = "draft"
    winner_arm_id: str | None = None


# ---------------------------------------------------------------------------
# 16. AttributionEvent
# ---------------------------------------------------------------------------
class AttributionEvent(BaseModel):
    schema_version: str = f"AttributionEvent:{SCHEMA_VERSION}"
    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime
    source: str
    channel: str
    account_id: str | None = None
    persona_id: str | None = None
    campaign_id: str | None = None
    touchpoint_type: str
    weight: float = 1.0
    revenue_attributed_usd: float = 0.0


__all__ = [
    "SCHEMA_VERSION",
    "FunnelStage",
    "Priority",
    "BriefIntake",
    "ResearchQuestionBucket",
    "ResearchDossier",
    "DossierSection",
    "PersonaSpec",
    "VoiceOfCustomer",
    "CompetitorProfile",
    "KeywordCluster",
    "Keyword",
    "PositioningStatement",
    "MessagingMatrix",
    "MessagingCell",
    "ContentBrief",
    "ChannelPlan",
    "ChannelAllocation",
    "CampaignCalendar",
    "CalendarItem",
    "KPIFramework",
    "KPISpec",
    "ApprovalRecord",
    "Experiment",
    "ExperimentArm",
    "AttributionEvent",
]

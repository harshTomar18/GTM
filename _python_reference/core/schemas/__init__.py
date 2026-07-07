"""Pydantic schemas for the Universal GTM OS."""

from core.schemas.tenant_profile import TenantProfile
from core.schemas.handoff import Handoff, QualitySignals
from core.schemas.policies import ApprovalPolicy, PolicySet
from core.schemas.agent_spec import AgentSpec, SLA, InputRef, FailureMode, CacheStrategy
from core.schemas.questions import Question, QuestionSet, Answer
from core.schemas.artifacts import (
    BriefIntake,
    ResearchDossier,
    PersonaSpec,
    CompetitorProfile,
    KeywordCluster,
    PositioningStatement,
    MessagingMatrix,
    ContentBrief,
    ChannelPlan,
    CampaignCalendar,
    KPIFramework,
    ApprovalRecord,
    Experiment,
    AttributionEvent,
)

__all__ = [
    "TenantProfile",
    "Handoff",
    "QualitySignals",
    "ApprovalPolicy",
    "PolicySet",
    "AgentSpec",
    "SLA",
    "InputRef",
    "FailureMode",
    "CacheStrategy",
    "Question",
    "QuestionSet",
    "Answer",
    "BriefIntake",
    "ResearchDossier",
    "PersonaSpec",
    "CompetitorProfile",
    "KeywordCluster",
    "PositioningStatement",
    "MessagingMatrix",
    "ContentBrief",
    "ChannelPlan",
    "CampaignCalendar",
    "KPIFramework",
    "ApprovalRecord",
    "Experiment",
    "AttributionEvent",
]

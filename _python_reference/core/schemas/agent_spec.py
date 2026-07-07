"""AgentSpec — declarative metadata for every agent class."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SLA(BaseModel):
    max_tokens: int = 16384
    max_latency_s: int = 600
    max_cost_usd: float = 5.00


class KPISpec(BaseModel):
    id: str
    name: str
    target: float | None = None
    unit: str = ""


class FailureMode(BaseModel):
    mode: str
    detection: str
    auto_mitigation: Literal["redo", "redo_strict", "escalate_to_human", "skip", "fail_hard"] = (
        "redo"
    )


class InputRef(BaseModel):
    key: str = Field(description="ContextBus key, e.g. 'phase1.audience_intelligence.primary_persona'")
    schema_version: str = Field(description="Required schema major version, e.g. 'PersonaSpec:v1'")
    required: bool = True


class CacheStrategy(BaseModel):
    enable_block_1_profile: bool = True
    enable_block_2_cycle: bool = True
    enable_block_3_agent: bool = False


class AgentSpec(BaseModel):
    """Per-agent declarative spec. Lives next to each agent's Python file."""

    slug: str = Field(description="Unique slug, e.g. 'phase1.brief_intake'")
    phase: int = Field(ge=1, le=5)
    stage: int = Field(ge=1, le=10)
    mission: str

    inputs: list[InputRef] = Field(default_factory=list)
    profile_keys: list[str] = Field(default_factory=list)
    output_schema: str = Field(description="Schema slug, e.g. 'BriefIntake:v1'")
    artifact_markdown_template: str | None = Field(
        default=None,
        description="Path to Jinja template under `prompts/<phase>/<agent>.md`",
    )

    approval_policy_ids: list[str] = Field(default_factory=list)
    kpis: list[KPISpec] = Field(default_factory=list)
    sla: SLA = Field(default_factory=SLA)

    failure_modes: list[FailureMode] = Field(default_factory=list)
    cache_strategy: CacheStrategy = Field(default_factory=CacheStrategy)

    model_plan: str = "claude-sonnet-4-6"
    model_gather: str = "claude-haiku-4-5-20251001"
    model_synthesize: str = "claude-sonnet-4-6"
    model_write: str = "claude-opus-4-7"
    model_review: str = "claude-sonnet-4-6"

    entrypoint: bool = Field(
        default=False,
        description="True only for agents that may run without approved upstream handoffs.",
    )
    reactive_subscribes: list[str] = Field(
        default_factory=list,
        description="Signal Bus patterns this agent subscribes to (Workstream D)",
    )

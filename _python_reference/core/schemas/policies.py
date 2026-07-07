"""Approval policy schema — matched against artifact attributes at approval time."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PolicyMatchCondition(BaseModel):
    """Conditions under which a policy fires. All non-null fields must match (AND)."""

    artifact_types: list[str] | None = None
    content_contains_any: list[str] | None = None
    content_contains_any_from: str | None = Field(
        default=None,
        description="Reference into TenantProfile, e.g. 'profile.frameworks'",
    )
    content_contains_pattern: str | None = None
    author_voice_role: list[str] | None = None
    total_spend_usd_gt: float | None = None
    profile_flag: str | None = Field(
        default=None,
        description="Reference into TenantProfile that must be truthy, e.g. 'profile.regulatory_constraints.content_review_required'",
    )


class RevisionLoop(BaseModel):
    max_iterations: int = 3
    on_exceed: str = "escalate_to_CEO"


class ApprovalPolicy(BaseModel):
    id: str
    when: PolicyMatchCondition
    requires: list[str] = Field(default_factory=list)
    sla_hours: int = 48
    escalate_after_hours: int | None = None
    escalate_to: list[str] = Field(default_factory=list)
    revision_loop: RevisionLoop = Field(default_factory=RevisionLoop)
    blocks_downstream: bool = False
    priority: int = Field(default=100, description="Lower = higher priority on match")


class PolicyDefaults(BaseModel):
    unmatched_artifact: dict[str, list[str]] = Field(
        default_factory=lambda: {"requires": ["CMO"]}
    )


class PolicySet(BaseModel):
    """Top-level container loaded from `governance/approval_policies.yaml`."""

    version: int = 1
    policies: list[ApprovalPolicy] = Field(default_factory=list)
    defaults: PolicyDefaults = Field(default_factory=PolicyDefaults)

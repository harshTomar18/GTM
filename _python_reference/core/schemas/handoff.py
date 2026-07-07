"""Handoff envelope — typed inter-agent communication artifact."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class QualitySignals(BaseModel):
    """Quality metadata attached to every artifact handoff."""

    self_review_score: float = Field(default=0.0, ge=0.0, le=1.0)
    citation_count: int = 0
    unknown_count: int = 0
    brand_validator_pass: bool = False
    claim_checker_pass: bool = False
    regulatory_lint_pass: bool = True
    pii_scan_pass: bool = True
    word_count: int | None = None


class Handoff(BaseModel):
    """Typed envelope that wraps every cross-agent artifact transfer.

    Receiving agents check existence, schema_version, freshness, quality, and approval
    state before consuming.
    """

    handoff_id: UUID = Field(default_factory=uuid4)
    from_agent: str
    to_agent: str | None = None
    cycle_id: str
    tenant_id: str

    artifact_ref: str
    artifact_version: str = "1.0.0"
    schema_version: str

    payload_summary: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
    quality_signals: QualitySignals = Field(default_factory=QualitySignals)

    expires_at: datetime | None = None
    upstream_chain: list[str] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: datetime | None = None
    approval_record_id: UUID | None = None

    def is_approved(self) -> bool:
        return self.approved_at is not None

    def schema_major(self) -> int:
        try:
            return int(self.schema_version.split(":")[-1].lstrip("v").split(".")[0])
        except (ValueError, IndexError):
            return 0

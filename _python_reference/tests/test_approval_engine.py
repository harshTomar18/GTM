"""ApprovalEngine tests — policy matching, state machine, audit log."""

from __future__ import annotations

import pytest

from core.approval_engine import PolicyMatchInput
from core.schemas.tenant_profile import TenantProfile


def _profile() -> TenantProfile:
    return TenantProfile(
        profile_id="t1",
        company={"legal_name": "X", "brand_name": "X"},
        industry={"primary": "saas"},
        frameworks=["NIST CSF 2.0", "MITRE ATT&CK"],
        regulatory_constraints=[
            {"jurisdiction": "US", "regimes": ["HIPAA"], "content_review_required": True}
        ],
    )


def test_brand_impacting_matches_positioning(approval_engine):
    matched = approval_engine.match_policies(
        PolicyMatchInput(artifact_type="positioning", content_text="...", profile=_profile())
    )
    ids = [p.id for p in matched]
    assert "brand_impacting" in ids


def test_framework_claims_match(approval_engine):
    matched = approval_engine.match_policies(
        PolicyMatchInput(
            artifact_type="content_assets",
            content_text="We align to NIST CSF 2.0 and MITRE ATT&CK.",
            profile=_profile(),
        )
    )
    ids = [p.id for p in matched]
    assert "framework_or_regulated_claims" in ids


def test_legal_regulated_match(approval_engine):
    matched = approval_engine.match_policies(
        PolicyMatchInput(
            artifact_type="website_copy",
            content_text="...",
            profile=_profile(),
        )
    )
    ids = [p.id for p in matched]
    assert "legal_regulated" in ids


def test_budget_threshold(approval_engine):
    matched = approval_engine.match_policies(
        PolicyMatchInput(
            artifact_type="paid_media_setup",
            content_text="...",
            total_spend_usd=50_000,
            profile=_profile(),
        )
    )
    ids = [p.id for p in matched]
    assert "budget_threshold" in ids

    matched_under = approval_engine.match_policies(
        PolicyMatchInput(
            artifact_type="paid_media_setup",
            content_text="...",
            total_spend_usd=10_000,
            profile=_profile(),
        )
    )
    assert "budget_threshold" not in [p.id for p in matched_under]


def test_request_and_decide(approval_engine):
    req = approval_engine.request_approval(
        tenant_id="t1",
        cycle_id="2026-Q3",
        artifact_ref="phase2.positioning.output",
        artifact_version="1.0.0",
        match_input=PolicyMatchInput(
            artifact_type="positioning", content_text="...", profile=_profile(),
        ),
    )
    assert "CMO" in req.required_roles
    assert req.decision == "pending"

    # Approve as CMO — should mark approved (only role required)
    rec = approval_engine.record_decision(
        approval_id=req.approval_id,
        approver_role="CMO",
        approver_name="Test CMO",
        decision="approved",
    )
    assert rec.decision == "approved"


def test_partial_then_full(approval_engine):
    # An artifact that requires multiple roles
    req = approval_engine.request_approval(
        tenant_id="t1",
        cycle_id="2026-Q3",
        artifact_ref="phase3.website_copy.output",
        artifact_version="1.0.0",
        match_input=PolicyMatchInput(
            artifact_type="website_copy",
            content_text="...",
            profile=_profile(),
        ),
    )
    assert {"CMO", "SME", "Legal"} <= set(req.required_roles)

    rec1 = approval_engine.record_decision(
        approval_id=req.approval_id, approver_role="CMO", approver_name="x", decision="approved",
    )
    assert rec1.decision == "pending"  # still missing SME + Legal

    approval_engine.record_decision(
        approval_id=req.approval_id, approver_role="SME", approver_name="y", decision="approved",
    )
    rec3 = approval_engine.record_decision(
        approval_id=req.approval_id, approver_role="Legal", approver_name="z", decision="approved",
    )
    assert rec3.decision == "approved"


def test_rejection_records(approval_engine):
    req = approval_engine.request_approval(
        tenant_id="t1",
        cycle_id="2026-Q3",
        artifact_ref="phase2.positioning.output",
        artifact_version="1.0.0",
        match_input=PolicyMatchInput(artifact_type="positioning", content_text="...", profile=_profile()),
    )
    rec = approval_engine.record_decision(
        approval_id=req.approval_id, approver_role="CMO", approver_name="x",
        decision="rejected", comment="too generic",
    )
    assert rec.decision == "rejected"


def test_invalid_role_raises(approval_engine):
    req = approval_engine.request_approval(
        tenant_id="t1",
        cycle_id="2026-Q3",
        artifact_ref="phase2.positioning.output",
        artifact_version="1.0.0",
        match_input=PolicyMatchInput(artifact_type="positioning", content_text="...", profile=_profile()),
    )
    with pytest.raises(ValueError):
        approval_engine.record_decision(
            approval_id=req.approval_id, approver_role="Intern", approver_name="x",
            decision="approved",
        )


def test_audit_log_written(approval_engine, tmp_path):
    audit_path = approval_engine.audit_log_path
    approval_engine.request_approval(
        tenant_id="t1",
        cycle_id="2026-Q3",
        artifact_ref="art",
        artifact_version="1.0.0",
        match_input=PolicyMatchInput(artifact_type="positioning", content_text="...", profile=_profile()),
    )
    assert audit_path.exists()
    lines = audit_path.read_text(encoding="utf-8").strip().split("\n")
    assert any("approval.requested" in line for line in lines)

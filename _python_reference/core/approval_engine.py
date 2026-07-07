"""ApprovalEngine — policy-driven approval state machine.

Workflow:
    DRAFT
      → match_policies(artifact) → list of ApprovalPolicy ids
      → request_approval() → PENDING_APPROVAL
      → approver decides → APPROVED | REJECTED | REVISIONS_REQUESTED
      → on REJECTED with retries → DRAFT (next iteration)
      → on REVISIONS_REQUESTED → DRAFT with comment as revision_brief

Every state transition writes to `governance/audit_log.jsonl` and to the
`audit_log_index` table.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import yaml
from pydantic import BaseModel

from core.schemas.policies import ApprovalPolicy, PolicySet
from core.schemas.tenant_profile import TenantProfile
from core.state import State


class ApprovalRequest(BaseModel):
    approval_id: str
    tenant_id: str
    cycle_id: str
    artifact_ref: str
    artifact_version: str
    policies_matched: list[str]
    required_roles: list[str]
    approvals_received: dict[str, datetime] = {}
    decision: str = "pending"
    revision_iteration: int = 0


class PolicyMatchInput(BaseModel):
    """The artifact attributes evaluated against PolicyMatchCondition."""

    artifact_type: str
    content_text: str = ""
    author_voice_role: str | None = None
    total_spend_usd: float | None = None
    profile: TenantProfile | None = None


class ApprovalEngine:
    def __init__(
        self,
        state: State,
        policy_path: Path,
        audit_log_path: Path,
    ) -> None:
        self.state = state
        self.policy_path = policy_path
        self.audit_log_path = audit_log_path
        self._policies: PolicySet | None = None

    @property
    def policies(self) -> PolicySet:
        if self._policies is None:
            raw = yaml.safe_load(self.policy_path.read_text(encoding="utf-8"))
            self._policies = PolicySet.model_validate(raw)
        return self._policies

    def reload(self) -> None:
        self._policies = None

    # ---------- policy matching ----------

    def match_policies(self, input: PolicyMatchInput) -> list[ApprovalPolicy]:
        """Return the subset of policies whose `when` condition matches the input."""
        matched: list[ApprovalPolicy] = []
        for pol in self.policies.policies:
            if self._matches(pol, input):
                matched.append(pol)
        matched.sort(key=lambda p: p.priority)
        return matched

    def _matches(self, pol: ApprovalPolicy, x: PolicyMatchInput) -> bool:
        w = pol.when
        if w.artifact_types is not None and x.artifact_type not in w.artifact_types:
            return False
        if w.content_contains_any is not None:
            if not any(s.lower() in x.content_text.lower() for s in w.content_contains_any):
                return False
        if w.content_contains_any_from is not None:
            terms = self._resolve_profile_list(w.content_contains_any_from, x.profile)
            if not any(t.lower() in x.content_text.lower() for t in terms):
                return False
        if w.content_contains_pattern is not None:
            if not re.search(w.content_contains_pattern, x.content_text):
                return False
        if w.author_voice_role is not None and x.author_voice_role not in w.author_voice_role:
            return False
        if w.total_spend_usd_gt is not None:
            if x.total_spend_usd is None or x.total_spend_usd <= w.total_spend_usd_gt:
                return False
        if w.profile_flag is not None and not self._resolve_profile_bool(w.profile_flag, x.profile):
            return False
        return True

    @staticmethod
    def _resolve_profile_list(path: str, profile: TenantProfile | None) -> list[str]:
        if profile is None:
            return []
        ref = path.removeprefix("profile.")
        cur: Any = profile.model_dump()
        for part in ref.split("."):
            if isinstance(cur, dict):
                cur = cur.get(part)
            else:
                return []
        return cur if isinstance(cur, list) else []

    @staticmethod
    def _resolve_profile_bool(path: str, profile: TenantProfile | None) -> bool:
        if profile is None:
            return False
        ref = path.removeprefix("profile.")
        cur: Any = profile.model_dump()
        for part in ref.split("."):
            if isinstance(cur, list):
                return any(bool(item.get(part)) for item in cur if isinstance(item, dict))
            if isinstance(cur, dict):
                cur = cur.get(part)
            else:
                return False
        return bool(cur)

    # ---------- approval request ----------

    def request_approval(
        self,
        *,
        tenant_id: str,
        cycle_id: str,
        artifact_ref: str,
        artifact_version: str,
        match_input: PolicyMatchInput,
        actor: str = "system",
    ) -> ApprovalRequest:
        matched_policies = self.match_policies(match_input)
        required_roles: list[str] = []
        for pol in matched_policies:
            for role in pol.requires:
                if role not in required_roles:
                    required_roles.append(role)
        if not matched_policies:
            required_roles = list(self.policies.defaults.unmatched_artifact.get("requires", ["CMO"]))

        approval_id = str(uuid4())
        now = datetime.utcnow()
        policy_ids = [p.id for p in matched_policies] or ["__default__"]

        with self.state.connection() as conn:
            conn.execute(
                """
                INSERT INTO approvals
                    (approval_id, tenant_id, cycle_id, artifact_ref, artifact_version,
                     policies_matched_json, required_roles_json, approvals_received_json,
                     decision, requested_at, revision_iteration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0)
                """,
                (
                    approval_id,
                    tenant_id,
                    cycle_id,
                    artifact_ref,
                    artifact_version,
                    json.dumps(policy_ids),
                    json.dumps(required_roles),
                    json.dumps({}),
                    now.isoformat(),
                ),
            )
            conn.commit()

        self._audit(
            event="approval.requested",
            actor=actor,
            actor_role="system",
            subject_type="artifact",
            subject_id=artifact_ref,
            tenant_id=tenant_id,
            cycle_id=cycle_id,
            policies_matched=policy_ids,
            rationale=f"v={artifact_version}; roles={','.join(required_roles)}",
            before={"decision": None},
            after={"decision": "pending", "approval_id": approval_id},
        )

        return ApprovalRequest(
            approval_id=approval_id,
            tenant_id=tenant_id,
            cycle_id=cycle_id,
            artifact_ref=artifact_ref,
            artifact_version=artifact_version,
            policies_matched=policy_ids,
            required_roles=required_roles,
        )

    # ---------- decisions ----------

    def record_decision(
        self,
        *,
        approval_id: str,
        approver_role: str,
        approver_name: str,
        decision: str,
        comment: str | None = None,
    ) -> ApprovalRequest:
        if decision not in ("approved", "rejected", "revisions_requested"):
            raise ValueError(f"Invalid decision: {decision}")

        with self.state.connection() as conn:
            row = conn.execute(
                "SELECT * FROM approvals WHERE approval_id = ?", (approval_id,)
            ).fetchone()
            if row is None:
                raise ValueError(f"Unknown approval_id: {approval_id}")

            required_roles: list[str] = json.loads(row["required_roles_json"])
            received: dict[str, str] = json.loads(row["approvals_received_json"] or "{}")

            if approver_role not in required_roles:
                raise ValueError(
                    f"Role {approver_role!r} is not required for this approval; "
                    f"required: {required_roles}"
                )

            now_iso = datetime.utcnow().isoformat()
            received[approver_role] = now_iso

            new_decision = row["decision"]
            decided_at = row["decided_at"]
            if decision in ("rejected", "revisions_requested"):
                new_decision = decision
                decided_at = now_iso
            elif decision == "approved":
                if all(r in received for r in required_roles):
                    new_decision = "approved"
                    decided_at = now_iso
                else:
                    new_decision = "pending"

            conn.execute(
                """
                UPDATE approvals SET
                    approvals_received_json = ?,
                    decision = ?,
                    decided_at = ?,
                    comment = COALESCE(?, comment)
                WHERE approval_id = ?
                """,
                (json.dumps(received), new_decision, decided_at, comment, approval_id),
            )
            conn.commit()

            updated = ApprovalRequest(
                approval_id=approval_id,
                tenant_id=row["tenant_id"],
                cycle_id=row["cycle_id"],
                artifact_ref=row["artifact_ref"],
                artifact_version=row["artifact_version"],
                policies_matched=json.loads(row["policies_matched_json"] or "[]"),
                required_roles=required_roles,
                approvals_received={
                    r: datetime.fromisoformat(t) for r, t in received.items()
                },
                decision=new_decision,
                revision_iteration=int(row["revision_iteration"] or 0),
            )

        self._audit(
            event="approval.decision",
            actor=approver_name,
            actor_role=approver_role,
            subject_type="approval",
            subject_id=approval_id,
            tenant_id=updated.tenant_id,
            cycle_id=updated.cycle_id,
            policies_matched=updated.policies_matched,
            rationale=comment,
            before={"decision": row["decision"]},
            after={"decision": new_decision},
        )

        return updated

    def get_approval(self, approval_id: str) -> ApprovalRequest | None:
        with self.state.connection() as conn:
            row = conn.execute(
                "SELECT * FROM approvals WHERE approval_id = ?", (approval_id,)
            ).fetchone()
            if row is None:
                return None
            received: dict[str, str] = json.loads(row["approvals_received_json"] or "{}")
            return ApprovalRequest(
                approval_id=row["approval_id"],
                tenant_id=row["tenant_id"],
                cycle_id=row["cycle_id"],
                artifact_ref=row["artifact_ref"],
                artifact_version=row["artifact_version"],
                policies_matched=json.loads(row["policies_matched_json"] or "[]"),
                required_roles=json.loads(row["required_roles_json"] or "[]"),
                approvals_received={
                    r: datetime.fromisoformat(t) for r, t in received.items()
                },
                decision=row["decision"],
                revision_iteration=int(row["revision_iteration"] or 0),
            )

    def list_pending(self, tenant_id: str, cycle_id: str | None = None) -> list[ApprovalRequest]:
        with self.state.connection() as conn:
            if cycle_id:
                rows = conn.execute(
                    "SELECT * FROM approvals WHERE tenant_id = ? AND cycle_id = ? AND decision = 'pending'",
                    (tenant_id, cycle_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM approvals WHERE tenant_id = ? AND decision = 'pending'",
                    (tenant_id,),
                ).fetchall()
        out: list[ApprovalRequest] = []
        for row in rows:
            received: dict[str, str] = json.loads(row["approvals_received_json"] or "{}")
            out.append(
                ApprovalRequest(
                    approval_id=row["approval_id"],
                    tenant_id=row["tenant_id"],
                    cycle_id=row["cycle_id"],
                    artifact_ref=row["artifact_ref"],
                    artifact_version=row["artifact_version"],
                    policies_matched=json.loads(row["policies_matched_json"] or "[]"),
                    required_roles=json.loads(row["required_roles_json"] or "[]"),
                    approvals_received={
                        r: datetime.fromisoformat(t) for r, t in received.items()
                    },
                    decision=row["decision"],
                    revision_iteration=int(row["revision_iteration"] or 0),
                )
            )
        return out

    # ---------- audit log ----------

    def _audit(
        self,
        *,
        event: str,
        actor: str,
        actor_role: str,
        subject_type: str,
        subject_id: str,
        tenant_id: str | None,
        cycle_id: str | None,
        policies_matched: list[str] | None = None,
        rationale: str | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
    ) -> None:
        ts = datetime.utcnow().isoformat()
        record = {
            "ts": ts,
            "event": event,
            "actor": actor,
            "actor_role": actor_role,
            "subject_type": subject_type,
            "subject_id": subject_id,
            "tenant_id": tenant_id,
            "cycle_id": cycle_id,
            "policies_matched": policies_matched or [],
            "rationale": rationale,
            "before": before,
            "after": after,
        }

        self.audit_log_path.parent.mkdir(parents=True, exist_ok=True)
        with self.audit_log_path.open("a", encoding="utf-8") as fh:
            offset = fh.tell()
            fh.write(json.dumps(record) + "\n")

        self.state.index_audit_event(
            ts=ts,
            event=event,
            actor=actor,
            actor_role=actor_role,
            subject_type=subject_type,
            subject_id=subject_id,
            tenant_id=tenant_id,
            cycle_id=cycle_id,
            policies_matched=policies_matched,
            rationale=rationale,
            raw_jsonl_offset=offset,
        )

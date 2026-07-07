"""ContextBus — typed pub/sub over the 4-tier memory model.

Tiers:
- T1 (Tenant, years):  `tenants/<id>/tenant_profile.yaml` + `tenants/<id>/baseline/*.md`
- T2 (Cycle, months):  SQLite `context_bus` table + `tenants/<id>/cycles/<cycle>/*.md`
- T3 (Run, hours):     In-memory only (per BaseAgent invocation)
- T4 (Conversation):   SQLite `agent_questions` table (managed by QuestionManager)

Higher-tier values are visible to lower-tier readers. Writes never overwrite prior
versions — every put creates a new `artifact_version` row.

Schema-version contract: receivers must pass `required_schema_version` (e.g.
"PersonaSpec:v1"). The bus enforces major-version compatibility (`v1` accepts any
`v1.x.y`; rejects `v2.*`).
"""

from __future__ import annotations

import fnmatch
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel

from core.state import State

Tier = Literal["T1", "T2", "T3", "T4"]


class HandoffMissing(Exception):
    """Raised when a required upstream handoff is not present."""


class SchemaMismatch(Exception):
    """Raised when artifact schema major version doesn't match the receiver's expectation."""


class StaleUpstream(Exception):
    """Raised when the requested artifact is older than what the receiver last consumed."""


_VERSION_RE = re.compile(r"^([A-Za-z]+):v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$")


def schema_major(schema_version: str) -> int:
    """Extract the major version int from a schema_version string."""
    m = _VERSION_RE.match(schema_version)
    if not m:
        return 0
    return int(m.group(2))


def schema_name(schema_version: str) -> str:
    m = _VERSION_RE.match(schema_version)
    return m.group(1) if m else schema_version


class BusEntry(BaseModel):
    key: str
    tenant_id: str
    cycle_id: str | None
    tier: Tier
    schema_version: str
    artifact_version: str
    payload: dict[str, Any]
    quality_signals: dict[str, Any] | None = None
    written_by_agent: str | None
    written_at: datetime
    approved_at: datetime | None = None
    approval_record_id: str | None = None


class ContextBus:
    """Single-process ContextBus backed by State (SQLite).

    Reactive subscriptions are registered in-memory and dispatched by the
    Orchestrator's reactive loop (Workstream D wires the actual signal flow).
    """

    def __init__(self, state: State, repo_root: Path) -> None:
        self.state = state
        self.repo_root = repo_root
        self._subscriptions: list[tuple[str, str]] = []
        self._run_cache: dict[str, dict[str, BusEntry]] = {}

    # ---------- write path ----------

    def put(
        self,
        *,
        key: str,
        value: BaseModel | dict[str, Any],
        tenant_id: str,
        tier: Tier,
        cycle_id: str | None = None,
        artifact_version: str = "1.0.0",
        schema_version: str | None = None,
        written_by_agent: str | None = None,
        quality_signals: dict[str, Any] | None = None,
        approved_at: datetime | None = None,
        approval_record_id: str | None = None,
    ) -> BusEntry:
        if isinstance(value, BaseModel):
            payload = value.model_dump(mode="json")
            sv = schema_version or payload.get("schema_version") or f"{type(value).__name__}:v1.0.0"
        else:
            payload = dict(value)
            sv = schema_version or payload.get("schema_version") or "Generic:v1.0.0"

        entry = BusEntry(
            key=key,
            tenant_id=tenant_id,
            cycle_id=cycle_id,
            tier=tier,
            schema_version=sv,
            artifact_version=artifact_version,
            payload=payload,
            quality_signals=quality_signals,
            written_by_agent=written_by_agent,
            written_at=datetime.utcnow(),
            approved_at=approved_at,
            approval_record_id=approval_record_id,
        )

        if tier == "T3":
            # In-memory only; scoped per run via cache_key
            run_cache_key = written_by_agent or "global"
            self._run_cache.setdefault(run_cache_key, {})[key] = entry
            return entry

        with self.state.connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO context_bus
                    (key, tenant_id, cycle_id, tier, schema_version, artifact_version,
                     payload_json, quality_signals_json, written_by_agent, written_at,
                     approved_at, approval_record_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    key,
                    tenant_id,
                    cycle_id,
                    tier,
                    sv,
                    artifact_version,
                    json.dumps(payload, default=str),
                    json.dumps(quality_signals, default=str) if quality_signals else None,
                    written_by_agent,
                    entry.written_at.isoformat(),
                    approved_at.isoformat() if approved_at else None,
                    approval_record_id,
                ),
            )
            conn.commit()

        return entry

    # ---------- read path ----------

    def get(
        self,
        *,
        key: str,
        tenant_id: str,
        cycle_id: str | None = None,
        required_schema_version: str | None = None,
        require_approved: bool = False,
    ) -> BusEntry:
        """Return latest version of `key`. Raises HandoffMissing / SchemaMismatch."""
        with self.state.connection() as conn:
            # Prefer cycle-scoped (T2) match, then tenant-scoped (T1)
            row = None
            if cycle_id is not None:
                row = conn.execute(
                    """
                    SELECT * FROM context_bus
                    WHERE tenant_id = ? AND key = ? AND cycle_id = ?
                    ORDER BY written_at DESC LIMIT 1
                    """,
                    (tenant_id, key, cycle_id),
                ).fetchone()
            if row is None:
                row = conn.execute(
                    """
                    SELECT * FROM context_bus
                    WHERE tenant_id = ? AND key = ?
                    ORDER BY written_at DESC LIMIT 1
                    """,
                    (tenant_id, key),
                ).fetchone()

        if row is None:
            raise HandoffMissing(f"No artifact for key={key!r} in tenant={tenant_id!r}")

        sv = row["schema_version"]
        if required_schema_version is not None:
            req_major = schema_major(required_schema_version)
            req_name = schema_name(required_schema_version)
            got_major = schema_major(sv)
            got_name = schema_name(sv)
            if req_name != got_name or req_major != got_major:
                raise SchemaMismatch(
                    f"Schema mismatch for key={key!r}: required={required_schema_version} got={sv}"
                )

        if require_approved and row["approved_at"] is None:
            raise HandoffMissing(f"Artifact for key={key!r} exists but is not approved")

        return BusEntry(
            key=row["key"],
            tenant_id=row["tenant_id"],
            cycle_id=row["cycle_id"],
            tier=row["tier"],
            schema_version=row["schema_version"],
            artifact_version=row["artifact_version"],
            payload=json.loads(row["payload_json"]),
            quality_signals=(
                json.loads(row["quality_signals_json"]) if row["quality_signals_json"] else None
            ),
            written_by_agent=row["written_by_agent"],
            written_at=datetime.fromisoformat(row["written_at"]),
            approved_at=(
                datetime.fromisoformat(row["approved_at"]) if row["approved_at"] else None
            ),
            approval_record_id=row["approval_record_id"],
        )

    def get_or_none(self, **kwargs: Any) -> BusEntry | None:
        try:
            return self.get(**kwargs)
        except (HandoffMissing, SchemaMismatch):
            return None

    def exists(self, *, key: str, tenant_id: str, cycle_id: str | None = None) -> bool:
        return self.get_or_none(key=key, tenant_id=tenant_id, cycle_id=cycle_id) is not None

    # ---------- promotion ----------

    def promote(
        self,
        *,
        from_value: Any,
        key: str,
        tenant_id: str,
        to_tier: Tier,
        cycle_id: str | None = None,
        source_agent: str | None = None,
    ) -> BusEntry:
        """Promote a T4 answer (or arbitrary value) to a higher tier under a reusable_key.

        Used by QuestionManager when a user answer carries a `reusable_key` — the
        answer becomes long-lived context.
        """
        payload = {"value": from_value, "promoted_from": "T4"}
        return self.put(
            key=key,
            value=payload,
            tenant_id=tenant_id,
            tier=to_tier,
            cycle_id=cycle_id,
            schema_version="PromotedAnswer:v1.0.0",
            written_by_agent=source_agent or "question_manager",
        )

    # ---------- subscriptions (Workstream D stub) ----------

    def subscribe(self, pattern: str, agent_slug: str) -> None:
        self._subscriptions.append((pattern, agent_slug))

    def matching_subscribers(self, key: str) -> list[str]:
        return [agent for pat, agent in self._subscriptions if fnmatch.fnmatch(key, pat)]

    # ---------- T1 baseline helpers ----------

    def load_t1_baseline(self, tenant_id: str) -> dict[str, str]:
        """Read all `tenants/<id>/baseline/*.md` files into a dict {filename: content}."""
        baseline_dir = self.repo_root / "tenants" / tenant_id / "baseline"
        if not baseline_dir.is_dir():
            return {}
        return {p.stem: p.read_text(encoding="utf-8") for p in baseline_dir.glob("*.md")}

    # ---------- dependency validation ----------

    def validate_dependencies(
        self,
        *,
        tenant_id: str,
        cycle_id: str,
        required: list[tuple[str, str, bool]],  # (key, schema_version, require_approved)
    ) -> list[str]:
        """Return list of missing/invalid dependencies as strings; empty = all good."""
        problems: list[str] = []
        for key, sv, require_approved in required:
            try:
                self.get(
                    key=key,
                    tenant_id=tenant_id,
                    cycle_id=cycle_id,
                    required_schema_version=sv,
                    require_approved=require_approved,
                )
            except HandoffMissing as e:
                problems.append(f"missing:{key} ({e})")
            except SchemaMismatch as e:
                problems.append(f"schema:{key} ({e})")
        return problems

    # ---------- run-scoped cache (T3) ----------

    def run_cache_clear(self, run_id: str) -> None:
        self._run_cache.pop(run_id, None)

    def run_cache_put(self, run_id: str, key: str, value: Any) -> None:
        self._run_cache.setdefault(run_id, {})[key] = value

    def run_cache_get(self, run_id: str, key: str) -> Any:
        return self._run_cache.get(run_id, {}).get(key)

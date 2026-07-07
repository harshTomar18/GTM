"""SQLite state layer for the Universal GTM OS.

Tables map to the runtime data domains: tenants, cycles, agents_runs, agent_questions,
handoffs, signals, experiments, attribution_events, approvals, context_bus, audit_log_index.

The on-disk audit_log is JSONL (`governance/audit_log.jsonl`); audit_log_index here is
an indexable mirror for queries. SQLite is fine for single-tenant; the schema is
Postgres-compatible (no SQLite-specific types) so an alembic migration to Postgres is
straightforward.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    profile_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    profile_version INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS cycles (
    cycle_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    started_at TEXT,
    completed_at TEXT,
    cycle_yaml_sha TEXT,
    PRIMARY KEY (tenant_id, cycle_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE IF NOT EXISTS agents_runs (
    run_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    agent_slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    prompt_sha TEXT,
    model_used TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    latency_ms INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    payload_json TEXT,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_agents_runs_cycle
    ON agents_runs(tenant_id, cycle_id, agent_slug);

CREATE TABLE IF NOT EXISTS agent_questions (
    answer_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cycle_id TEXT,
    run_id TEXT,
    agent_slug TEXT NOT NULL,
    question_id TEXT NOT NULL,
    reusable_key TEXT,
    answer_value TEXT,
    source TEXT NOT NULL DEFAULT 'user',
    answered_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_questions_reusable
    ON agent_questions(tenant_id, reusable_key)
    WHERE reusable_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS context_bus (
    key TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    cycle_id TEXT,
    tier TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    artifact_version TEXT NOT NULL DEFAULT '1.0.0',
    payload_json TEXT NOT NULL,
    quality_signals_json TEXT,
    written_by_agent TEXT,
    written_at TEXT NOT NULL,
    approved_at TEXT,
    approval_record_id TEXT,
    PRIMARY KEY (tenant_id, key, artifact_version)
);

CREATE INDEX IF NOT EXISTS idx_context_bus_cycle
    ON context_bus(tenant_id, cycle_id, key);

CREATE TABLE IF NOT EXISTS handoffs (
    handoff_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    from_agent TEXT NOT NULL,
    to_agent TEXT,
    artifact_ref TEXT NOT NULL,
    artifact_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    payload_summary_json TEXT,
    quality_signals_json TEXT,
    created_at TEXT NOT NULL,
    approved_at TEXT,
    approval_record_id TEXT
);

CREATE TABLE IF NOT EXISTS approvals (
    approval_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    artifact_ref TEXT NOT NULL,
    artifact_version TEXT NOT NULL,
    policies_matched_json TEXT,
    required_roles_json TEXT,
    approvals_received_json TEXT,
    decision TEXT NOT NULL DEFAULT 'pending',
    requested_at TEXT NOT NULL,
    decided_at TEXT,
    comment TEXT,
    revision_iteration INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_approvals_status
    ON approvals(tenant_id, cycle_id, decision);

CREATE TABLE IF NOT EXISTS signals (
    signal_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    account_id TEXT,
    persona_id TEXT,
    intensity REAL,
    source TEXT NOT NULL,
    payload_json TEXT,
    received_at TEXT NOT NULL,
    acted_upon_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_signals_type
    ON signals(tenant_id, signal_type, received_at);

CREATE TABLE IF NOT EXISTS experiments (
    experiment_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cycle_id TEXT,
    artifact_ref TEXT NOT NULL,
    arms_json TEXT NOT NULL,
    assignment_strategy TEXT NOT NULL DEFAULT 'ab',
    success_metric TEXT NOT NULL,
    sample_size_target INTEGER,
    status TEXT NOT NULL DEFAULT 'draft',
    winner_arm_id TEXT,
    created_at TEXT NOT NULL,
    concluded_at TEXT
);

CREATE TABLE IF NOT EXISTS attribution_events (
    event_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    channel TEXT NOT NULL,
    account_id TEXT,
    persona_id TEXT,
    campaign_id TEXT,
    touchpoint_type TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    revenue_attributed_usd REAL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_attribution_lookup
    ON attribution_events(tenant_id, campaign_id, timestamp);

CREATE TABLE IF NOT EXISTS audit_log_index (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    event TEXT NOT NULL,
    actor TEXT,
    actor_role TEXT,
    subject_type TEXT,
    subject_id TEXT,
    tenant_id TEXT,
    cycle_id TEXT,
    policies_matched_json TEXT,
    rationale TEXT,
    raw_jsonl_offset INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_log_subject
    ON audit_log_index(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS schema_meta (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);
"""

CURRENT_SCHEMA_VERSION = 1


class State:
    """Thin SQLite wrapper. All methods are synchronous.

    Designed to be the single ownership boundary for the DB connection. Tests
    instantiate with a `:memory:` path; production uses `gtm_state.db` under
    the tenants directory or repo root.
    """

    def __init__(self, db_path: str | Path = "gtm_state.db") -> None:
        self.db_path = str(db_path)
        self._conn: sqlite3.Connection | None = None
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with self.connection() as conn:
            conn.executescript(SCHEMA_SQL)
            row = conn.execute("SELECT version FROM schema_meta ORDER BY version DESC LIMIT 1").fetchone()
            if row is None:
                conn.execute(
                    "INSERT INTO schema_meta (version, applied_at) VALUES (?, ?)",
                    (CURRENT_SCHEMA_VERSION, datetime.utcnow().isoformat()),
                )
                conn.commit()

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        try:
            yield conn
        finally:
            conn.close()

    # ---- tenants ----

    def upsert_tenant(self, tenant_id: str, profile_path: str, profile_version: int = 2) -> None:
        now = datetime.utcnow().isoformat()
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO tenants (tenant_id, profile_path, created_at, updated_at, profile_version)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(tenant_id) DO UPDATE SET
                    profile_path = excluded.profile_path,
                    updated_at = excluded.updated_at,
                    profile_version = excluded.profile_version
                """,
                (tenant_id, profile_path, now, now, profile_version),
            )
            conn.commit()

    # ---- cycles ----

    def start_cycle(self, tenant_id: str, cycle_id: str, cycle_yaml_sha: str | None) -> None:
        now = datetime.utcnow().isoformat()
        with self.connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO cycles (cycle_id, tenant_id, status, started_at, cycle_yaml_sha)
                VALUES (?, ?, 'running', ?, ?)
                """,
                (cycle_id, tenant_id, now, cycle_yaml_sha),
            )
            conn.commit()

    def get_cycle(self, tenant_id: str, cycle_id: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(
                "SELECT * FROM cycles WHERE tenant_id = ? AND cycle_id = ?",
                (tenant_id, cycle_id),
            ).fetchone()
            return dict(row) if row else None

    # ---- agent runs ----

    def record_run(
        self,
        run_id: str,
        tenant_id: str,
        cycle_id: str,
        agent_slug: str,
        status: str = "pending",
        prompt_sha: str | None = None,
        model_used: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO agents_runs
                    (run_id, tenant_id, cycle_id, agent_slug, status, started_at, prompt_sha, model_used, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    tenant_id,
                    cycle_id,
                    agent_slug,
                    status,
                    datetime.utcnow().isoformat(),
                    prompt_sha,
                    model_used,
                    json.dumps(payload) if payload else None,
                ),
            )
            conn.commit()

    def complete_run(
        self,
        run_id: str,
        status: str,
        tokens_in: int = 0,
        tokens_out: int = 0,
        cache_read_tokens: int = 0,
        cache_write_tokens: int = 0,
        cost_usd: float = 0.0,
        latency_ms: int = 0,
        payload: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE agents_runs SET
                    status = ?,
                    completed_at = ?,
                    tokens_in = ?,
                    tokens_out = ?,
                    cache_read_tokens = ?,
                    cache_write_tokens = ?,
                    cost_usd = ?,
                    latency_ms = ?,
                    payload_json = COALESCE(?, payload_json),
                    error_message = ?
                WHERE run_id = ?
                """,
                (
                    status,
                    datetime.utcnow().isoformat(),
                    tokens_in,
                    tokens_out,
                    cache_read_tokens,
                    cache_write_tokens,
                    cost_usd,
                    latency_ms,
                    json.dumps(payload) if payload else None,
                    error_message,
                    run_id,
                ),
            )
            conn.commit()

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM agents_runs WHERE run_id = ?", (run_id,)).fetchone()
            return dict(row) if row else None

    # ---- audit log index ----

    def index_audit_event(
        self,
        ts: str,
        event: str,
        actor: str | None = None,
        actor_role: str | None = None,
        subject_type: str | None = None,
        subject_id: str | None = None,
        tenant_id: str | None = None,
        cycle_id: str | None = None,
        policies_matched: list[str] | None = None,
        rationale: str | None = None,
        raw_jsonl_offset: int | None = None,
    ) -> int:
        with self.connection() as conn:
            cur = conn.execute(
                """
                INSERT INTO audit_log_index
                    (ts, event, actor, actor_role, subject_type, subject_id,
                     tenant_id, cycle_id, policies_matched_json, rationale, raw_jsonl_offset)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ts,
                    event,
                    actor,
                    actor_role,
                    subject_type,
                    subject_id,
                    tenant_id,
                    cycle_id,
                    json.dumps(policies_matched) if policies_matched else None,
                    rationale,
                    raw_jsonl_offset,
                ),
            )
            conn.commit()
            return int(cur.lastrowid or 0)


def get_default_state(repo_root: Path | None = None) -> State:
    """Return a State pointing at `<repo_root>/gtm_state.db`."""
    root = repo_root or Path(__file__).resolve().parent.parent
    return State(root / "gtm_state.db")

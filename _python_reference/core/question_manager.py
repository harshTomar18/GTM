"""QuestionManager — minimum-viable-context (MVC) gate + ConversationStore.

Each agent declares its required inputs in `questions.yaml`. The QuestionManager:
1. Loads the QuestionSet for an agent.
2. For each question, checks the ConversationStore (T4) by `reusable_key` for prior
   answers — reuses silently if found.
3. Reports the differential (missing required answers) to the caller.
4. Persists new answers; promotes reusable ones to T2 via the ContextBus.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import yaml
from pydantic import BaseModel

from core.context_bus import ContextBus
from core.schemas.questions import Answer, Question, QuestionSet
from core.state import State


class NeedAnswers(BaseModel):
    """Returned by `resolve_inputs` when required answers are still missing."""

    agent_slug: str
    missing: list[Question]
    already_answered: dict[str, Any]


class ReadyForRun(BaseModel):
    """Returned by `resolve_inputs` when all required answers are present."""

    agent_slug: str
    answers: dict[str, Any]


ResolveResult = NeedAnswers | ReadyForRun


def load_question_set(path: Path) -> QuestionSet:
    """Load a `questions.yaml` file into a QuestionSet."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return QuestionSet.model_validate(raw)


class QuestionManager:
    def __init__(self, state: State, context_bus: ContextBus) -> None:
        self.state = state
        self.bus = context_bus

    # ---------- resolution ----------

    def resolve_inputs(
        self,
        *,
        question_set: QuestionSet,
        tenant_id: str,
        cycle_id: str | None,
        required_for: str = "plan",
    ) -> ResolveResult:
        """Check the conversation + reuse stores; return ready or missing."""
        answers: dict[str, Any] = {}
        missing: list[Question] = []

        for q in question_set.questions:
            # Skip questions whose required_for level is more permissive than current need.
            # Treat "plan" < "gather" < "synthesize" < "write" as ascending dependency depth.
            # For Workstream A, we only check that questions required at-or-before the current
            # stage are answered.
            if not self._is_required_at(q.required_for, required_for):
                # try cached answer anyway for transparency, but don't block on missing
                cached = self._lookup_existing(q, tenant_id)
                if cached is not None:
                    answers[q.id] = cached
                continue

            cached = self._lookup_existing(q, tenant_id)
            if cached is not None:
                answers[q.id] = cached
                continue

            if q.default is not None:
                answers[q.id] = q.default
                continue

            missing.append(q)

        if missing:
            return NeedAnswers(
                agent_slug=question_set.agent_slug,
                missing=missing,
                already_answered=answers,
            )
        return ReadyForRun(agent_slug=question_set.agent_slug, answers=answers)

    @staticmethod
    def _is_required_at(question_level: str, current_stage: str) -> bool:
        order = {"plan": 0, "gather": 1, "synthesize": 2, "write": 3, "optional": 99}
        return order.get(question_level, 99) <= order.get(current_stage, 0)

    def _lookup_existing(self, q: Question, tenant_id: str) -> Any | None:
        """Look up a prior answer via reusable_key, then via tenant+question_id."""
        with self.state.connection() as conn:
            if q.reusable_key:
                row = conn.execute(
                    """
                    SELECT answer_value FROM agent_questions
                    WHERE tenant_id = ? AND reusable_key = ?
                    ORDER BY answered_at DESC LIMIT 1
                    """,
                    (tenant_id, q.reusable_key),
                ).fetchone()
                if row is not None:
                    return self._decode_answer(row["answer_value"], q.type)

            row = conn.execute(
                """
                SELECT answer_value FROM agent_questions
                WHERE tenant_id = ? AND agent_slug = ? AND question_id = ?
                ORDER BY answered_at DESC LIMIT 1
                """,
                (tenant_id, q.id.split(".")[0] if "." in q.id else "*", q.id),
            ).fetchone()
            if row is not None:
                return self._decode_answer(row["answer_value"], q.type)
        return None

    @staticmethod
    def _decode_answer(stored: str | None, q_type: str) -> Any:
        if stored is None:
            return None
        if q_type == "number":
            try:
                return float(stored) if "." in stored else int(stored)
            except ValueError:
                return stored
        if q_type == "boolean":
            return stored.lower() in ("1", "true", "yes", "y")
        if q_type == "json":
            try:
                return json.loads(stored)
            except json.JSONDecodeError:
                return stored
        return stored

    # ---------- persistence ----------

    def record_answer(
        self,
        *,
        agent_slug: str,
        question: Question,
        answer_value: Any,
        tenant_id: str,
        cycle_id: str | None = None,
        run_id: str | None = None,
        source: str = "user",
    ) -> Answer:
        """Persist an answer; promote to T2 via ContextBus if reusable_key is set."""
        stored = (
            json.dumps(answer_value)
            if question.type == "json"
            else (str(answer_value) if answer_value is not None else None)
        )
        answer_id = str(uuid4())
        with self.state.connection() as conn:
            conn.execute(
                """
                INSERT INTO agent_questions
                    (answer_id, tenant_id, cycle_id, run_id, agent_slug, question_id,
                     reusable_key, answer_value, source, answered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    answer_id,
                    tenant_id,
                    cycle_id,
                    run_id,
                    agent_slug,
                    question.id,
                    question.reusable_key,
                    stored,
                    source,
                    datetime.utcnow().isoformat(),
                ),
            )
            conn.commit()

        if question.reusable_key:
            self.bus.promote(
                from_value=answer_value,
                key=question.reusable_key,
                tenant_id=tenant_id,
                to_tier="T2" if cycle_id else "T1",
                cycle_id=cycle_id,
                source_agent=agent_slug,
            )

        return Answer(
            question_id=question.id,
            agent_slug=agent_slug,
            run_id=run_id,
            answer_value=answer_value,
            source=source,  # type: ignore[arg-type]
            reusable_key=question.reusable_key,
        )

    def record_answers_batch(
        self,
        *,
        agent_slug: str,
        questions: list[Question],
        answers: dict[str, Any],
        tenant_id: str,
        cycle_id: str | None = None,
        run_id: str | None = None,
        source: str = "user",
    ) -> list[Answer]:
        out: list[Answer] = []
        for q in questions:
            if q.id in answers:
                out.append(
                    self.record_answer(
                        agent_slug=agent_slug,
                        question=q,
                        answer_value=answers[q.id],
                        tenant_id=tenant_id,
                        cycle_id=cycle_id,
                        run_id=run_id,
                        source=source,
                    )
                )
        return out

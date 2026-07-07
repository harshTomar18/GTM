"""QuestionManager tests — resolve_inputs, persistence, reuse."""

from __future__ import annotations

from core.question_manager import NeedAnswers, ReadyForRun
from core.schemas.questions import Question, QuestionSet


def _qs():
    return QuestionSet(
        agent_slug="phase1.brief_intake",
        questions=[
            Question(id="q_obj", prompt="Goal?", required_for="plan",
                     reusable_key="cycle.objective.primary"),
            Question(id="q_budget", prompt="Budget?", required_for="plan", type="number"),
            Question(id="q_optional", prompt="Bonus?", required_for="optional"),
        ],
    )


def test_resolve_missing(question_manager):
    result = question_manager.resolve_inputs(
        question_set=_qs(), tenant_id="t1", cycle_id="2026-Q3", required_for="plan",
    )
    assert isinstance(result, NeedAnswers)
    assert len(result.missing) == 2
    assert {q.id for q in result.missing} == {"q_obj", "q_budget"}


def test_record_and_reuse(question_manager):
    qs = _qs()
    q_obj = qs.questions[0]
    question_manager.record_answer(
        agent_slug="phase1.brief_intake", question=q_obj,
        answer_value="land 5 ICPs", tenant_id="t1", cycle_id="2026-Q3",
    )

    # The reusable_key should make q_obj answered for the next agent that asks it.
    qs2 = QuestionSet(
        agent_slug="phase2.positioning",
        questions=[Question(id="q_obj2", prompt="Goal?", required_for="plan",
                            reusable_key="cycle.objective.primary")],
    )
    result = question_manager.resolve_inputs(
        question_set=qs2, tenant_id="t1", cycle_id="2026-Q3", required_for="plan",
    )
    assert isinstance(result, ReadyForRun)
    assert result.answers.get("q_obj2") == "land 5 ICPs"


def test_batch_record(question_manager):
    qs = _qs()
    answers = question_manager.record_answers_batch(
        agent_slug=qs.agent_slug,
        questions=qs.questions,
        answers={"q_obj": "x", "q_budget": 180000},
        tenant_id="t1",
        cycle_id="2026-Q3",
    )
    assert len(answers) == 2
    # q_optional not provided, not recorded

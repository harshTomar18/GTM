"""Question registry schema — declarative questions per agent.

Each agent has a co-located `questions.yaml`. QuestionManager reads it, checks the
ConversationStore for prior answers via `reusable_key`, and surfaces the differential
to the user.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

QuestionType = Literal["text", "long_text", "enum", "number", "date", "json", "boolean"]
RequiredFor = Literal["plan", "gather", "synthesize", "write", "optional"]


class Question(BaseModel):
    id: str = Field(description="Stable id unique within an agent, e.g. 'q_business_objective'")
    prompt: str = Field(description="The actual question text shown to the user")
    type: QuestionType = "text"
    required_for: RequiredFor = "plan"
    validation_regex: str | None = None
    enum_options: list[str] | None = None
    depends_on: list[str] = Field(default_factory=list)
    reusable_key: str | None = Field(
        default=None,
        description=(
            "Canonical T2 promotion key, e.g. 'cycle.objective.primary'. "
            "If set, prior answers under this key are reused silently."
        ),
    )
    default: str | None = None
    help_text: str | None = None


class QuestionSet(BaseModel):
    """Loaded from `agents/<phase>/<agent>/questions.yaml`."""

    agent_slug: str
    questions: list[Question] = Field(default_factory=list)


class Answer(BaseModel):
    question_id: str
    agent_slug: str
    run_id: str | None = None
    answer_value: str | int | float | bool | None
    source: Literal["user", "reuse_t2", "reuse_t1", "default"] = "user"
    reusable_key: str | None = None

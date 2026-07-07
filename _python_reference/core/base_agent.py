"""BaseAgent — five-stage pipeline base class.

Stages (all overridable by concrete agents):
    1. plan(profile, cycle_state, deps) -> AgentPlan
    2. gather_context(plan) -> ContextBundle  (reads memory + asks questions)
    3. synthesize(context) -> StructuredDraft  (structured reasoning, JSON only)
    4. write(draft) -> Artifact (Pydantic BaseModel)  (voice-applied final output)
    5. self_review(artifact) -> ReviewVerdict  (rubric scoring before approval gate)

Concrete agents subclass and override stages they need. The base provides a
sensible default for each, runs them via `run()`, manages telemetry, and writes
to State + ContextBus.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel

from core.approval_engine import ApprovalEngine, PolicyMatchInput
from core.context_bus import ContextBus, HandoffMissing, SchemaMismatch
from core.llm_client import LLMClient, LLMResponse
from core.prompt_renderer import PromptRenderer, RenderedPrompt
from core.question_manager import NeedAnswers, QuestionManager, ReadyForRun, load_question_set
from core.schemas.agent_spec import AgentSpec
from core.schemas.handoff import Handoff, QualitySignals
from core.schemas.questions import QuestionSet
from core.schemas.tenant_profile import TenantProfile
from core.state import State


@dataclass
class AgentPlan:
    inputs_resolved: dict[str, Any] = field(default_factory=dict)
    notes: str = ""
    ready: bool = True
    blockers: list[str] = field(default_factory=list)


@dataclass
class ContextBundle:
    upstream: dict[str, Any] = field(default_factory=dict)
    answers: dict[str, Any] = field(default_factory=dict)
    profile_keys: dict[str, Any] = field(default_factory=dict)
    retrievals: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class StructuredDraft:
    payload: dict[str, Any] = field(default_factory=dict)
    citations: list[str] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class ReviewVerdict:
    score: float = 0.0
    issues: list[str] = field(default_factory=list)
    auto_redo: bool = False
    redo_brief: str | None = None


@dataclass
class RunResult:
    run_id: str
    agent_slug: str
    status: str
    artifact: BaseModel | dict[str, Any] | None = None
    handoff: Handoff | None = None
    review: ReviewVerdict | None = None
    cost_usd: float = 0.0
    blockers: list[str] = field(default_factory=list)
    missing_answers: list[Any] = field(default_factory=list)


class BaseAgent:
    """Five-stage pipeline. Subclasses override stages and supply an AgentSpec."""

    spec: AgentSpec

    def __init__(
        self,
        *,
        state: State,
        context_bus: ContextBus,
        question_manager: QuestionManager,
        prompt_renderer: PromptRenderer,
        llm_client: LLMClient,
        approval_engine: ApprovalEngine,
        questions_path: Path | None = None,
    ) -> None:
        if not hasattr(self, "spec"):
            raise RuntimeError(
                f"{type(self).__name__} must define a class attribute `spec: AgentSpec`"
            )
        self.state = state
        self.bus = context_bus
        self.questions = question_manager
        self.renderer = prompt_renderer
        self.llm = llm_client
        self.approvals = approval_engine
        self._question_set: QuestionSet | None = None
        self._questions_path = questions_path

    @property
    def question_set(self) -> QuestionSet | None:
        if self._question_set is None and self._questions_path and self._questions_path.exists():
            self._question_set = load_question_set(self._questions_path)
        return self._question_set

    # ---------- stages (overridable) ----------

    def plan(
        self,
        profile: TenantProfile,
        cycle_id: str,
        deps: dict[str, Any],
    ) -> AgentPlan:
        blockers: list[str] = []
        required = [
            (i.key, i.schema_version, False) for i in self.spec.inputs if i.required
        ]
        if required:
            problems = self.bus.validate_dependencies(
                tenant_id=profile.profile_id,
                cycle_id=cycle_id,
                required=required,
            )
            blockers.extend(problems)

        if self.question_set is not None:
            resolution = self.questions.resolve_inputs(
                question_set=self.question_set,
                tenant_id=profile.profile_id,
                cycle_id=cycle_id,
                required_for="plan",
            )
            if isinstance(resolution, NeedAnswers):
                return AgentPlan(
                    inputs_resolved={},
                    notes=f"{len(resolution.missing)} required answers missing",
                    ready=False,
                    blockers=[f"need_answer:{q.id}" for q in resolution.missing],
                )
            inputs_resolved = resolution.answers
        else:
            inputs_resolved = {}

        return AgentPlan(
            inputs_resolved=inputs_resolved,
            notes="",
            ready=not blockers,
            blockers=blockers,
        )

    def gather_context(
        self,
        profile: TenantProfile,
        cycle_id: str,
        plan_result: AgentPlan,
    ) -> ContextBundle:
        bundle = ContextBundle(answers=plan_result.inputs_resolved)
        for input_ref in self.spec.inputs:
            entry = self.bus.get_or_none(
                key=input_ref.key,
                tenant_id=profile.profile_id,
                cycle_id=cycle_id,
                required_schema_version=input_ref.schema_version,
            )
            if entry is not None:
                bundle.upstream[input_ref.key] = entry.payload
        for k in self.spec.profile_keys:
            val: Any = profile.model_dump()
            for part in k.removeprefix("profile.").split("."):
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    val = None
                    break
            bundle.profile_keys[k] = val
        return bundle

    def synthesize(
        self,
        profile: TenantProfile,
        bundle: ContextBundle,
    ) -> StructuredDraft:
        """Default: call the LLM with the agent's prompt; parse JSON output.

        Concrete agents may override to add tool calls, multi-step reasoning, etc.
        """
        agent_prompt_path = self.spec.artifact_markdown_template or (
            f"{self._phase_dir()}/{self.spec.slug.split('.')[-1]}.md"
        )
        rendered = self.renderer.render(
            profile=profile,
            agent_prompt_path=agent_prompt_path,
            agent_inputs={
                "upstream": bundle.upstream,
                "answers": bundle.answers,
                "profile_keys": bundle.profile_keys,
            },
        )
        response = self._call_llm(rendered, model=self.spec.model_synthesize)
        parsed = self.llm.parse_json(response.text) or {}
        return StructuredDraft(payload=parsed, confidence=0.5)

    def write(
        self,
        profile: TenantProfile,
        draft: StructuredDraft,
    ) -> BaseModel | dict[str, Any]:
        """Default: return the draft payload unchanged. Override to apply voice."""
        return draft.payload

    def self_review(
        self,
        artifact: BaseModel | dict[str, Any],
    ) -> ReviewVerdict:
        """Default rubric: presence checks on key fields. Override for richer review."""
        return ReviewVerdict(score=0.8, issues=[], auto_redo=False)

    # ---------- run orchestrator ----------

    def run(
        self,
        *,
        profile: TenantProfile,
        cycle_id: str,
        deps: dict[str, Any] | None = None,
    ) -> RunResult:
        run_id = str(uuid4())
        deps = deps or {}
        self.state.record_run(
            run_id=run_id,
            tenant_id=profile.profile_id,
            cycle_id=cycle_id,
            agent_slug=self.spec.slug,
            status="running",
            model_used=self.spec.model_write,
        )

        cost_total = 0.0
        start = time.perf_counter()

        try:
            plan_result = self.plan(profile, cycle_id, deps)
            if not plan_result.ready:
                self.state.complete_run(
                    run_id=run_id,
                    status="blocked",
                    cost_usd=cost_total,
                    payload={"plan_blockers": plan_result.blockers},
                )
                return RunResult(
                    run_id=run_id,
                    agent_slug=self.spec.slug,
                    status="blocked",
                    blockers=plan_result.blockers,
                    missing_answers=[b for b in plan_result.blockers if b.startswith("need_answer:")],
                )

            bundle = self.gather_context(profile, cycle_id, plan_result)
            draft = self.synthesize(profile, bundle)
            artifact = self.write(profile, draft)
            review = self.self_review(artifact)

            if review.auto_redo:
                # Future: retry with redo_brief; for Workstream A we report and stop.
                self.state.complete_run(
                    run_id=run_id,
                    status="needs_revision",
                    cost_usd=cost_total,
                    payload={"review": review.__dict__},
                )
                return RunResult(
                    run_id=run_id,
                    agent_slug=self.spec.slug,
                    status="needs_revision",
                    artifact=artifact,
                    review=review,
                    cost_usd=cost_total,
                )

            handoff = self._publish(profile, cycle_id, artifact, review)

            self._request_approval(profile, cycle_id, artifact, handoff)

            latency_ms = int((time.perf_counter() - start) * 1000)
            self.state.complete_run(
                run_id=run_id,
                status="completed",
                cost_usd=cost_total,
                latency_ms=latency_ms,
                payload={
                    "handoff_id": str(handoff.handoff_id),
                    "artifact_version": handoff.artifact_version,
                },
            )
            return RunResult(
                run_id=run_id,
                agent_slug=self.spec.slug,
                status="completed",
                artifact=artifact,
                handoff=handoff,
                review=review,
                cost_usd=cost_total,
            )
        except (HandoffMissing, SchemaMismatch) as e:
            self.state.complete_run(
                run_id=run_id,
                status="dependency_error",
                error_message=str(e),
            )
            return RunResult(
                run_id=run_id,
                agent_slug=self.spec.slug,
                status="dependency_error",
                blockers=[str(e)],
            )
        except Exception as e:  # pragma: no cover
            self.state.complete_run(
                run_id=run_id,
                status="error",
                error_message=str(e),
            )
            raise

    # ---------- helpers ----------

    def _phase_dir(self) -> str:
        phase = self.spec.slug.split(".")[0]
        return phase  # e.g. "phase1"

    def _call_llm(self, rendered: RenderedPrompt, model: str) -> LLMResponse:
        return self.llm.generate(
            model=model,
            system_blocks=rendered.system_blocks,
            user_message=rendered.user_message,
            max_tokens=self.spec.sla.max_tokens,
        )

    def _publish(
        self,
        profile: TenantProfile,
        cycle_id: str,
        artifact: BaseModel | dict[str, Any],
        review: ReviewVerdict,
    ) -> Handoff:
        payload = artifact.model_dump() if isinstance(artifact, BaseModel) else dict(artifact)
        schema_version = payload.get("schema_version") or self.spec.output_schema

        bus_key = f"{self.spec.slug}.output"
        self.bus.put(
            key=bus_key,
            value=payload,
            tenant_id=profile.profile_id,
            tier="T2",
            cycle_id=cycle_id,
            schema_version=schema_version,
            written_by_agent=self.spec.slug,
            quality_signals={"self_review_score": review.score, "issues": review.issues},
        )

        handoff = Handoff(
            from_agent=self.spec.slug,
            cycle_id=cycle_id,
            tenant_id=profile.profile_id,
            artifact_ref=bus_key,
            schema_version=schema_version,
            payload_summary={"size": len(str(payload))},
            quality_signals=QualitySignals(self_review_score=review.score),
            upstream_chain=[inp.key for inp in self.spec.inputs],
        )
        return handoff

    def _request_approval(
        self,
        profile: TenantProfile,
        cycle_id: str,
        artifact: BaseModel | dict[str, Any],
        handoff: Handoff,
    ) -> None:
        payload_text = (
            artifact.model_dump_json() if isinstance(artifact, BaseModel) else str(artifact)
        )
        match_input = PolicyMatchInput(
            artifact_type=self.spec.slug.split(".")[-1],
            content_text=payload_text,
            profile=profile,
        )
        self.approvals.request_approval(
            tenant_id=profile.profile_id,
            cycle_id=cycle_id,
            artifact_ref=handoff.artifact_ref,
            artifact_version=handoff.artifact_version,
            match_input=match_input,
            actor=self.spec.slug,
        )

"""Orchestrator — cycle DAG executor.

Loads `workflows/cycle.yaml`, builds a topologically sorted DAG of agents grouped
into phases, and executes them respecting `depends_on` and `parallel_group`.

Workstream A goal: the orchestrator can compile the DAG, report what it would
execute, and run a dry-cycle with stub agents (no real Phase 1-5 agents yet).
Workstreams B/C/D will fill in concrete agent classes; this file does not need
to change to accommodate them.
"""

from __future__ import annotations

import hashlib
import importlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

from core.approval_engine import ApprovalEngine
from core.base_agent import BaseAgent, RunResult
from core.context_bus import ContextBus
from core.llm_client import LLMClient
from core.prompt_renderer import PromptRenderer
from core.question_manager import QuestionManager
from core.schemas.tenant_profile import TenantProfile
from core.state import State


class CycleAgentSpec(BaseModel):
    slug: str
    depends_on: list[str] = []
    parallel_group: str | None = None
    optional: bool = False


class CyclePhaseSpec(BaseModel):
    id: str
    label: str
    agents: list[CycleAgentSpec] = []
    exit_gate: str | None = None


class CycleSpec(BaseModel):
    version: int = 1
    default_cycle_length: str = "monthly"
    phases: list[CyclePhaseSpec] = []


def load_cycle_spec(path: Path) -> tuple[CycleSpec, str]:
    raw = path.read_text(encoding="utf-8")
    spec = CycleSpec.model_validate(yaml.safe_load(raw))
    sha = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return spec, sha


@dataclass
class DAGNode:
    slug: str
    phase_id: str
    depends_on: list[str] = field(default_factory=list)
    parallel_group: str | None = None
    optional: bool = False
    phase_order: int = 0


@dataclass
class CompiledDAG:
    nodes: dict[str, DAGNode]
    execution_order: list[list[str]]  # batches; each batch runs in parallel
    phase_exit_gates: dict[str, str | None]

    def to_text_diagram(self) -> str:
        lines: list[str] = []
        phases: dict[int, list[DAGNode]] = {}
        for node in self.nodes.values():
            phases.setdefault(node.phase_order, []).append(node)

        for ph_order in sorted(phases.keys()):
            phase_nodes = phases[ph_order]
            phase_id = phase_nodes[0].phase_id
            lines.append(f"== Phase {ph_order + 1}: {phase_id} ==")
            for n in phase_nodes:
                deps = f" ← {','.join(n.depends_on)}" if n.depends_on else ""
                pg = f"  [parallel:{n.parallel_group}]" if n.parallel_group else ""
                opt = " (optional)" if n.optional else ""
                lines.append(f"  • {n.slug}{deps}{pg}{opt}")
            gate = self.phase_exit_gates.get(phase_id)
            if gate:
                lines.append(f"  ★ Exit gate: {gate}")
        lines.append("")
        lines.append("Execution batches (parallel within batch):")
        for i, batch in enumerate(self.execution_order, start=1):
            lines.append(f"  Batch {i}: {', '.join(batch)}")
        return "\n".join(lines)


def compile_dag(spec: CycleSpec) -> CompiledDAG:
    nodes: dict[str, DAGNode] = {}
    phase_exit_gates: dict[str, str | None] = {}
    for phase_idx, phase in enumerate(spec.phases):
        phase_exit_gates[phase.id] = phase.exit_gate
        for a in phase.agents:
            if a.slug in nodes:
                raise ValueError(f"Duplicate agent slug in cycle spec: {a.slug}")
            nodes[a.slug] = DAGNode(
                slug=a.slug,
                phase_id=phase.id,
                depends_on=list(a.depends_on),
                parallel_group=a.parallel_group,
                optional=a.optional,
                phase_order=phase_idx,
            )

    # Topological order in batches (Kahn). Within a phase, respect depends_on;
    # also keep batches phase-pure so phase exit gates can fire between them.
    remaining = dict(nodes)
    seen: set[str] = set()
    batches: list[list[str]] = []
    current_phase: int | None = None
    current_batch: list[str] = []

    while remaining:
        ready = [
            slug
            for slug, n in remaining.items()
            if all(d in seen for d in n.depends_on)
        ]
        if not ready:
            raise ValueError(
                f"Cycle DAG has unresolved dependencies among: {list(remaining.keys())}"
            )
        ready.sort(key=lambda s: (remaining[s].phase_order, s))
        first_phase = remaining[ready[0]].phase_order

        if current_phase is None:
            current_phase = first_phase
        if first_phase != current_phase:
            if current_batch:
                batches.append(current_batch)
                current_batch = []
            current_phase = first_phase

        batch = [s for s in ready if remaining[s].phase_order == current_phase]
        for s in batch:
            seen.add(s)
            current_batch.append(s)
            del remaining[s]
        batches.append(current_batch)
        current_batch = []

    if current_batch:
        batches.append(current_batch)

    return CompiledDAG(
        nodes=nodes,
        execution_order=batches,
        phase_exit_gates=phase_exit_gates,
    )


# ---------------------------------------------------------------------------


class AgentRegistry:
    """Resolves slugs to agent classes via Python import paths.

    Convention: `phase1.brief_intake` ↔ `agents.phase1_research.brief_intake.Agent`.
    Falls back to a stub agent if the module is missing (Workstream A).
    """

    def __init__(self, allow_stubs: bool = True) -> None:
        self.allow_stubs = allow_stubs

    @staticmethod
    def _module_path(slug: str) -> str:
        phase, agent = slug.split(".", 1)
        phase_dir = {
            "phase1": "phase1_research",
            "phase2": "phase2_narrative",
            "phase3": "phase3_assets",
            "phase4": "phase4_distribution",
            "phase5": "phase5_measurement",
        }.get(phase, phase)
        return f"agents.{phase_dir}.{agent}"

    def load(self, slug: str) -> type[BaseAgent] | None:
        module_path = self._module_path(slug)
        try:
            module = importlib.import_module(module_path)
            cls = getattr(module, "Agent", None)
            if cls is not None and issubclass(cls, BaseAgent):
                return cls  # type: ignore[no-any-return]
        except ModuleNotFoundError:
            pass
        if self.allow_stubs:
            return _make_stub_class(slug)
        return None


def _make_stub_class(slug: str) -> type[BaseAgent]:
    """Build a do-nothing agent class for slugs that don't yet have an implementation."""
    from core.schemas.agent_spec import AgentSpec

    phase = int(slug.split(".")[0].removeprefix("phase"))

    class StubAgent(BaseAgent):
        spec = AgentSpec(
            slug=slug,
            phase=phase,
            stage=1,
            mission=f"[STUB] {slug} — no implementation yet",
            output_schema=f"{slug}.Stub:v1.0.0",
            entrypoint=True,
        )

        def plan(self, profile, cycle_id, deps):  # type: ignore[override]
            return super().plan(profile, cycle_id, deps)

        def synthesize(self, profile, bundle):  # type: ignore[override]
            from core.base_agent import StructuredDraft

            return StructuredDraft(
                payload={
                    "schema_version": self.spec.output_schema,
                    "stub": True,
                    "agent_slug": slug,
                    "note": "Dry-run stub output",
                }
            )

        def write(self, profile, draft):  # type: ignore[override]
            return draft.payload

    StubAgent.__name__ = f"Stub_{slug.replace('.', '_')}"
    return StubAgent


# ---------------------------------------------------------------------------


@dataclass
class OrchestratorServices:
    state: State
    context_bus: ContextBus
    question_manager: QuestionManager
    prompt_renderer: PromptRenderer
    llm_client: LLMClient
    approval_engine: ApprovalEngine


@dataclass
class CycleRunReport:
    cycle_id: str
    tenant_id: str
    dag: CompiledDAG
    runs: list[RunResult] = field(default_factory=list)
    dry_run: bool = False
    aborted_at: str | None = None


class Orchestrator:
    def __init__(
        self,
        services: OrchestratorServices,
        cycle_spec_path: Path,
        registry: AgentRegistry | None = None,
    ) -> None:
        self.services = services
        self.cycle_spec_path = cycle_spec_path
        self.registry = registry or AgentRegistry(allow_stubs=True)
        self._spec: CycleSpec | None = None
        self._spec_sha: str | None = None

    @property
    def spec(self) -> CycleSpec:
        if self._spec is None:
            self._spec, self._spec_sha = load_cycle_spec(self.cycle_spec_path)
        return self._spec

    def compile(self) -> CompiledDAG:
        return compile_dag(self.spec)

    def start_cycle(
        self,
        *,
        profile: TenantProfile,
        cycle_id: str,
        dry_run: bool = False,
    ) -> CycleRunReport:
        dag = self.compile()
        self.services.state.start_cycle(
            tenant_id=profile.profile_id,
            cycle_id=cycle_id,
            cycle_yaml_sha=self._spec_sha,
        )

        report = CycleRunReport(
            cycle_id=cycle_id,
            tenant_id=profile.profile_id,
            dag=dag,
            dry_run=dry_run,
        )

        if dry_run:
            return report

        for batch in dag.execution_order:
            for slug in batch:
                node = dag.nodes[slug]
                cls = self.registry.load(slug)
                if cls is None:
                    if node.optional:
                        continue
                    report.aborted_at = slug
                    return report
                qpath = self._question_path(slug)
                agent = cls(
                    state=self.services.state,
                    context_bus=self.services.context_bus,
                    question_manager=self.services.question_manager,
                    prompt_renderer=self.services.prompt_renderer,
                    llm_client=self.services.llm_client,
                    approval_engine=self.services.approval_engine,
                    questions_path=qpath if qpath.exists() else None,
                )
                result = agent.run(profile=profile, cycle_id=cycle_id)
                report.runs.append(result)
                if result.status == "blocked":
                    report.aborted_at = slug
                    return report

        return report

    def _question_path(self, slug: str) -> Path:
        phase_dir = {
            "phase1": "phase1_research",
            "phase2": "phase2_narrative",
            "phase3": "phase3_assets",
            "phase4": "phase4_distribution",
            "phase5": "phase5_measurement",
        }.get(slug.split(".")[0])
        if not phase_dir:
            return Path()
        agent_name = slug.split(".", 1)[1]
        repo_root = self.cycle_spec_path.parent.parent
        return repo_root / "agents" / phase_dir / f"{agent_name}.questions.yaml"

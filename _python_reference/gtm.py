"""Universal GTM OS — CLI entry point.

Commands:
    gtm tenant init --tenant <id> [--pack <pack_id>]
    gtm validate-profile <path>
    gtm cycle start --tenant <id> --cycle <id> [--dry-run]
    gtm agent run --tenant <id> --cycle <id> --agent <slug>
    gtm pending --tenant <id> [--cycle <id>]
    gtm approve <approval-id> --as <role> [--comment "..."]
    gtm reject <approval-id> --as <role> [--comment "..."]
    gtm dashboard --tenant <id>
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Optional

import typer
from rich import box
from rich.console import Console
from rich.table import Table

from core.approval_engine import ApprovalEngine
from core.context_bus import ContextBus
from core.llm_client import LLMClient
from core.orchestrator import Orchestrator, OrchestratorServices, AgentRegistry
from core.prompt_renderer import PromptRenderer
from core.question_manager import QuestionManager
from core.state import State
from core.tenant_loader import load_tenant, validate_profile_path

REPO_ROOT = Path(__file__).resolve().parent
console = Console()

app = typer.Typer(
    help="Universal AI GTM Operating System CLI.",
    add_completion=False,
    no_args_is_help=True,
)
tenant_app = typer.Typer(help="Tenant management commands.", no_args_is_help=True)
cycle_app = typer.Typer(help="Cycle commands.", no_args_is_help=True)
agent_app = typer.Typer(help="Agent commands.", no_args_is_help=True)

app.add_typer(tenant_app, name="tenant")
app.add_typer(cycle_app, name="cycle")
app.add_typer(agent_app, name="agent")


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _build_services() -> OrchestratorServices:
    state = State(REPO_ROOT / "gtm_state.db")
    bus = ContextBus(state=state, repo_root=REPO_ROOT)
    qm = QuestionManager(state=state, context_bus=bus)
    renderer = PromptRenderer(
        prompts_root=REPO_ROOT / "prompts",
        packs_root=REPO_ROOT / "vertical_packs",
    )
    llm = LLMClient(dry_run=None)
    approvals = ApprovalEngine(
        state=state,
        policy_path=REPO_ROOT / "governance" / "approval_policies.yaml",
        audit_log_path=REPO_ROOT / "governance" / "audit_log.jsonl",
    )
    return OrchestratorServices(
        state=state,
        context_bus=bus,
        question_manager=qm,
        prompt_renderer=renderer,
        llm_client=llm,
        approval_engine=approvals,
    )


def _orchestrator(services: OrchestratorServices) -> Orchestrator:
    return Orchestrator(
        services=services,
        cycle_spec_path=REPO_ROOT / "workflows" / "cycle.yaml",
        registry=AgentRegistry(allow_stubs=True),
    )


# ---------------------------------------------------------------------------
# tenant
# ---------------------------------------------------------------------------


@tenant_app.command("init")
def tenant_init(
    tenant: str = typer.Option(..., "--tenant", help="Tenant id (kebab/snake case)"),
    pack: str = typer.Option(
        "_template", "--pack", help="Vertical pack to extend (default: _template)"
    ),
    overwrite: bool = typer.Option(False, "--overwrite", help="Replace existing tenant dir"),
) -> None:
    """Scaffold a new tenant directory by copying `_example`."""
    src = REPO_ROOT / "tenants" / "_example"
    dst = REPO_ROOT / "tenants" / tenant
    if dst.exists() and not overwrite:
        console.print(f"[red]Tenant directory already exists:[/] {dst}")
        console.print("Use --overwrite to replace.")
        raise typer.Exit(2)
    if dst.exists() and overwrite:
        shutil.rmtree(dst)
    shutil.copytree(src, dst)

    # Replace profile_id and extends in the new file
    profile_yaml = dst / "tenant_profile.yaml"
    text = profile_yaml.read_text(encoding="utf-8")
    text = text.replace("profile_id: _example", f"profile_id: {tenant}")
    text = text.replace(
        "extends: vertical_packs/_template", f"extends: vertical_packs/{pack}"
    )
    profile_yaml.write_text(text, encoding="utf-8")

    services = _build_services()
    services.state.upsert_tenant(
        tenant_id=tenant,
        profile_path=str(profile_yaml),
        profile_version=2,
    )

    console.print(f"[green]✓[/] Created tenant [bold]{tenant}[/] at {dst}")
    console.print(f"   Pack: {pack}")
    console.print(f"   Profile: {profile_yaml}")
    console.print("\nNext: edit the profile, then `gtm validate-profile <path>`.")


# ---------------------------------------------------------------------------
# validate-profile (top-level)
# ---------------------------------------------------------------------------


@app.command("validate-profile")
def validate_profile(path: Path = typer.Argument(..., exists=True, readable=True)) -> None:
    """Validate a tenant_profile.yaml against the TenantProfile schema."""
    try:
        prof = validate_profile_path(path)
    except Exception as e:
        console.print(f"[red]✗ Profile is invalid:[/] {e}")
        raise typer.Exit(1)
    console.print(f"[green]✓ Profile valid:[/] {prof.profile_id} ({prof.company.brand_name})")
    console.print(f"   Primary motion: {prof.primary_motion()}")
    icp = prof.primary_icp()
    if icp:
        console.print(f"   Primary ICP: {icp.id}")
    console.print(f"   Frameworks: {', '.join(prof.frameworks) or '(none)'}")
    console.print(
        f"   Languages: {prof.languages.default} (supported: {', '.join(prof.languages.supported)})"
    )


# ---------------------------------------------------------------------------
# cycle
# ---------------------------------------------------------------------------


@cycle_app.command("start")
def cycle_start(
    tenant: str = typer.Option(..., "--tenant"),
    cycle: str = typer.Option(..., "--cycle"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Compile DAG; do not execute"),
) -> None:
    """Start a cycle. With --dry-run, prints the compiled DAG and exits."""
    services = _build_services()
    profile = load_tenant(tenant, REPO_ROOT)
    services.state.upsert_tenant(
        tenant_id=profile.profile_id,
        profile_path=str(REPO_ROOT / "tenants" / tenant / "tenant_profile.yaml"),
    )

    orch = _orchestrator(services)
    report = orch.start_cycle(profile=profile, cycle_id=cycle, dry_run=dry_run)

    console.print(f"[bold]Cycle:[/] {report.cycle_id} for {report.tenant_id}")
    console.print(f"[bold]Mode:[/] {'DRY-RUN' if dry_run else 'LIVE'}")
    console.print()
    console.print(report.dag.to_text_diagram())

    if not dry_run:
        table = Table(box=box.SIMPLE_HEAD, title="Run results")
        table.add_column("Agent")
        table.add_column("Status")
        table.add_column("Run ID")
        table.add_column("Cost USD", justify="right")
        for r in report.runs:
            table.add_row(r.agent_slug, r.status, r.run_id[:8], f"{r.cost_usd:.4f}")
        console.print(table)
        if report.aborted_at:
            console.print(f"[yellow]Cycle aborted at:[/] {report.aborted_at}")


@cycle_app.command("status")
def cycle_status(
    tenant: str = typer.Option(..., "--tenant"),
    cycle: str = typer.Option(..., "--cycle"),
) -> None:
    """Show the persisted state of a cycle."""
    services = _build_services()
    info = services.state.get_cycle(tenant_id=tenant, cycle_id=cycle)
    if not info:
        console.print(f"[red]No such cycle:[/] {tenant}/{cycle}")
        raise typer.Exit(1)
    console.print(json.dumps(info, indent=2, default=str))


# ---------------------------------------------------------------------------
# agent
# ---------------------------------------------------------------------------


@agent_app.command("run")
def agent_run(
    tenant: str = typer.Option(..., "--tenant"),
    cycle: str = typer.Option(..., "--cycle"),
    agent: str = typer.Option(..., "--agent", help="Agent slug, e.g. phase1.brief_intake"),
) -> None:
    """Run a single agent within a cycle."""
    services = _build_services()
    profile = load_tenant(tenant, REPO_ROOT)
    services.state.upsert_tenant(
        tenant_id=profile.profile_id,
        profile_path=str(REPO_ROOT / "tenants" / tenant / "tenant_profile.yaml"),
    )

    registry = AgentRegistry(allow_stubs=True)
    cls = registry.load(agent)
    if cls is None:
        console.print(f"[red]Unknown agent slug:[/] {agent}")
        raise typer.Exit(1)

    instance = cls(
        state=services.state,
        context_bus=services.context_bus,
        question_manager=services.question_manager,
        prompt_renderer=services.prompt_renderer,
        llm_client=services.llm_client,
        approval_engine=services.approval_engine,
    )
    services.state.start_cycle(tenant_id=profile.profile_id, cycle_id=cycle, cycle_yaml_sha=None)
    result = instance.run(profile=profile, cycle_id=cycle)

    console.print(f"[bold]Run {result.run_id[:8]}[/] — status: {result.status}")
    if result.blockers:
        console.print(f"[yellow]Blockers:[/] {', '.join(result.blockers)}")
    if result.handoff:
        console.print(f"Handoff: {result.handoff.artifact_ref} v{result.handoff.artifact_version}")


# ---------------------------------------------------------------------------
# approvals
# ---------------------------------------------------------------------------


@app.command("pending")
def pending(
    tenant: str = typer.Option(..., "--tenant"),
    cycle: Optional[str] = typer.Option(None, "--cycle"),
) -> None:
    """List pending approvals for a tenant."""
    services = _build_services()
    items = services.approval_engine.list_pending(tenant_id=tenant, cycle_id=cycle)
    if not items:
        console.print("[dim]No pending approvals.[/]")
        return
    table = Table(box=box.SIMPLE_HEAD)
    table.add_column("Approval ID")
    table.add_column("Artifact")
    table.add_column("Version")
    table.add_column("Required Roles")
    table.add_column("Received")
    for a in items:
        table.add_row(
            a.approval_id[:8],
            a.artifact_ref,
            a.artifact_version,
            ",".join(a.required_roles),
            ",".join(a.approvals_received.keys()) or "—",
        )
    console.print(table)


@app.command("approve")
def approve(
    approval_id: str = typer.Argument(...),
    as_role: str = typer.Option(..., "--as", help="Role you're approving as"),
    name: str = typer.Option("CLI", "--name"),
    comment: Optional[str] = typer.Option(None, "--comment"),
) -> None:
    services = _build_services()
    rec = services.approval_engine.record_decision(
        approval_id=approval_id,
        approver_role=as_role,
        approver_name=name,
        decision="approved",
        comment=comment,
    )
    console.print(f"[green]✓[/] Recorded. Decision now: {rec.decision}")


@app.command("reject")
def reject(
    approval_id: str = typer.Argument(...),
    as_role: str = typer.Option(..., "--as"),
    name: str = typer.Option("CLI", "--name"),
    comment: Optional[str] = typer.Option(None, "--comment"),
) -> None:
    services = _build_services()
    rec = services.approval_engine.record_decision(
        approval_id=approval_id,
        approver_role=as_role,
        approver_name=name,
        decision="rejected",
        comment=comment,
    )
    console.print(f"[yellow]✓[/] Recorded. Decision now: {rec.decision}")


@app.command("dashboard")
def dashboard(tenant: str = typer.Option(..., "--tenant")) -> None:
    """One-shot text dashboard for a tenant."""
    services = _build_services()
    pending_items = services.approval_engine.list_pending(tenant_id=tenant)
    console.print(f"[bold]Tenant:[/] {tenant}")
    console.print(f"[bold]Pending approvals:[/] {len(pending_items)}")
    for a in pending_items[:10]:
        console.print(f"  • {a.approval_id[:8]} → {a.artifact_ref} (need {','.join(a.required_roles)})")


if __name__ == "__main__":
    app()

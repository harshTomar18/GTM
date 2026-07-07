"""Pytest fixtures for Universal-GTM-OS tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

# Force dry-run for any LLM-touching code
os.environ.setdefault("GTM_DRY_RUN", "1")


@pytest.fixture
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture
def tmp_db_path(tmp_path: Path) -> Path:
    return tmp_path / "test_state.db"


@pytest.fixture
def state(tmp_db_path: Path):
    from core.state import State

    return State(tmp_db_path)


@pytest.fixture
def context_bus(state, repo_root):
    from core.context_bus import ContextBus

    return ContextBus(state=state, repo_root=repo_root)


@pytest.fixture
def example_profile():
    from core.tenant_loader import load_tenant

    return load_tenant("_example", REPO_ROOT)


@pytest.fixture
def llm_dry():
    from core.llm_client import LLMClient

    return LLMClient(dry_run=True)


@pytest.fixture
def prompt_renderer(repo_root):
    from core.prompt_renderer import PromptRenderer

    return PromptRenderer(
        prompts_root=repo_root / "prompts",
        packs_root=repo_root / "vertical_packs",
    )


@pytest.fixture
def approval_engine(state, tmp_path):
    from core.approval_engine import ApprovalEngine

    audit_path = tmp_path / "audit_log.jsonl"
    return ApprovalEngine(
        state=state,
        policy_path=REPO_ROOT / "governance" / "approval_policies.yaml",
        audit_log_path=audit_path,
    )


@pytest.fixture
def question_manager(state, context_bus):
    from core.question_manager import QuestionManager

    return QuestionManager(state=state, context_bus=context_bus)

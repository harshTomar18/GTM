"""PromptRenderer + cache-block builder tests."""

from __future__ import annotations

import pytest


def test_profile_block_renders(prompt_renderer, example_profile):
    block = prompt_renderer.build_profile_block(example_profile)
    assert block["type"] == "text"
    assert block["cache_control"] == {"type": "ephemeral"}
    text = block["text"]
    assert example_profile.company.brand_name in text
    assert example_profile.industry.primary in text


def test_full_render_returns_user_message(prompt_renderer, example_profile, tmp_path):
    # Use an inline jinja template for the agent block
    agent_prompt_dir = prompt_renderer.prompts_root / "_test"
    agent_prompt_dir.mkdir(exist_ok=True)
    (agent_prompt_dir / "echo.md").write_text(
        "AGENT INPUTS:\n{{ inputs | tojson }}\n", encoding="utf-8"
    )
    try:
        rendered = prompt_renderer.render(
            profile=example_profile,
            agent_prompt_path="_test/echo.md",
            agent_inputs={"hello": "world"},
        )
    finally:
        (agent_prompt_dir / "echo.md").unlink(missing_ok=True)
        try:
            agent_prompt_dir.rmdir()
        except OSError:
            pass

    assert "AGENT INPUTS" in rendered.user_message
    assert "world" in rendered.user_message
    assert len(rendered.system_blocks) >= 1
    assert len(rendered.prompt_sha) == 16


def test_cycle_block_fallback(prompt_renderer, example_profile):
    block = prompt_renderer.build_cycle_block(example_profile, {"objective": "land 5"})
    assert block is not None
    assert "Cycle Context" in block["text"] or "land 5" in block["text"]


def test_no_cycle_block_when_empty(prompt_renderer, example_profile):
    assert prompt_renderer.build_cycle_block(example_profile, {}) is None

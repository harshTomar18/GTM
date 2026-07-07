"""PromptRenderer — Jinja templating + Anthropic cache-block builder.

Outputs a `RenderedPrompt` containing:
- `system_blocks`: list of content blocks for the Anthropic `system` field, each
  optionally marked with `cache_control = {"type": "ephemeral"}`.
- `user_message`: the per-run user message (block 3, not cached).

Three cache layers (per blueprint §6.4):
1. Profile block (tenant + vertical pack defaults) — TTL ~1h, cache-controlled.
2. Cycle block (research dossier, narrative lock, prior cycle outputs) — cache-controlled.
3. Agent block (this agent's prompt + run inputs) — ephemeral, not cached.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from core.schemas.tenant_profile import TenantProfile


@dataclass
class RenderedPrompt:
    system_blocks: list[dict[str, Any]] = field(default_factory=list)
    user_message: str = ""
    prompt_sha: str = ""


class PromptRenderer:
    def __init__(self, prompts_root: Path, packs_root: Path) -> None:
        self.prompts_root = prompts_root
        self.packs_root = packs_root
        self.env = Environment(
            loader=FileSystemLoader(
                [str(prompts_root), str(packs_root)]
            ),
            undefined=StrictUndefined,
            autoescape=select_autoescape(default=False),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    # ---------- block builders ----------

    def build_profile_block(
        self,
        profile: TenantProfile,
        extra_pack_fragments: list[str] | None = None,
    ) -> dict[str, Any]:
        """Block 1: tenant profile + optional pack fragments. Cache-controlled."""
        header_template = self.env.get_template("_shared/profile_header.md")
        rendered = header_template.render(profile=profile)

        fragments: list[str] = [rendered]
        for frag_path in extra_pack_fragments or []:
            tpl = self.env.get_template(frag_path)
            fragments.append(tpl.render(profile=profile))

        text = "\n\n".join(fragments)
        return {
            "type": "text",
            "text": text,
            "cache_control": {"type": "ephemeral"},
        }

    def build_cycle_block(
        self,
        profile: TenantProfile,
        cycle_context: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Block 2: cycle-scoped context (dossier, narrative lock, prior outputs)."""
        if not cycle_context:
            return None
        template_path = "_shared/cycle_header.md"
        try:
            tpl = self.env.get_template(template_path)
            text = tpl.render(profile=profile, cycle=cycle_context)
        except Exception:
            # If the shared template doesn't exist yet (Workstream A), fall back to YAML dump
            text = "## Cycle Context\n\n```yaml\n" + yaml.safe_dump(cycle_context, sort_keys=False) + "\n```"
        return {
            "type": "text",
            "text": text,
            "cache_control": {"type": "ephemeral"},
        }

    def build_agent_block(
        self,
        agent_prompt_path: str,
        agent_inputs: dict[str, Any],
        profile: TenantProfile,
    ) -> str:
        """Block 3: agent-specific prompt + this run's inputs. Not cached."""
        tpl = self.env.get_template(agent_prompt_path)
        return tpl.render(profile=profile, inputs=agent_inputs)

    # ---------- one-shot render ----------

    def render(
        self,
        *,
        profile: TenantProfile,
        agent_prompt_path: str,
        agent_inputs: dict[str, Any],
        cycle_context: dict[str, Any] | None = None,
        pack_fragments: list[str] | None = None,
    ) -> RenderedPrompt:
        prompt = RenderedPrompt()

        prompt.system_blocks.append(
            self.build_profile_block(profile, extra_pack_fragments=pack_fragments)
        )

        cycle_block = self.build_cycle_block(profile, cycle_context or {})
        if cycle_block is not None:
            prompt.system_blocks.append(cycle_block)

        prompt.user_message = self.build_agent_block(
            agent_prompt_path=agent_prompt_path,
            agent_inputs=agent_inputs,
            profile=profile,
        )

        # Stable prompt SHA = hash of (system text + user text). Used to pin
        # agent runs to a prompt version in agents_runs.prompt_sha.
        joined = "\n---\n".join(b["text"] for b in prompt.system_blocks) + "\n---\n" + prompt.user_message
        prompt.prompt_sha = hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]
        return prompt

"""LLMClient — Anthropic SDK wrapper with telemetry, caching, and dry-run.

Returns an `LLMResponse` capturing the response text plus token usage, cost,
latency, and cache hit metrics. Pricing constants are approximate and should be
verified against current Anthropic pricing — they exist for budget telemetry
rather than billing.

`dry_run=True` skips the network and returns a deterministic synthetic response.
This is the default for Workstream A so the framework can exercise end-to-end
flows without API keys.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Any

try:
    from anthropic import Anthropic
except ImportError:  # pragma: no cover
    Anthropic = None  # type: ignore[assignment]


PRICING_PER_M_TOKENS: dict[str, dict[str, float]] = {
    # Approximate USD/million tokens. Update against current Anthropic pricing.
    "claude-opus-4-7": {
        "input": 15.0,
        "output": 75.0,
        "cache_write": 18.75,
        "cache_read": 1.50,
    },
    "claude-sonnet-4-6": {
        "input": 3.0,
        "output": 15.0,
        "cache_write": 3.75,
        "cache_read": 0.30,
    },
    "claude-haiku-4-5-20251001": {
        "input": 1.0,
        "output": 5.0,
        "cache_write": 1.25,
        "cache_read": 0.10,
    },
}


@dataclass
class LLMResponse:
    text: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0
    stop_reason: str | None = None
    raw: dict[str, Any] | None = field(default=None, repr=False)


class CostBudgetExceeded(Exception):
    """Raised when a run's accumulated cost would exceed AgentSpec.sla.max_cost_usd."""


class LLMClient:
    def __init__(
        self,
        api_key: str | None = None,
        dry_run: bool | None = None,
    ) -> None:
        env_dry = os.getenv("GTM_DRY_RUN", "").lower() in ("1", "true", "yes")
        self.dry_run = env_dry if dry_run is None else dry_run
        self._client: Anthropic | None = None
        if not self.dry_run:
            if Anthropic is None:
                raise RuntimeError(
                    "anthropic package not installed; either `pip install anthropic` "
                    "or use dry_run=True"
                )
            key = api_key or os.getenv("ANTHROPIC_API_KEY")
            if not key:
                raise RuntimeError(
                    "ANTHROPIC_API_KEY env var not set; either configure it or use dry_run=True"
                )
            self._client = Anthropic(api_key=key)

    # ---------- call ----------

    def generate(
        self,
        *,
        model: str,
        system_blocks: list[dict[str, Any]],
        user_message: str,
        max_tokens: int = 4096,
        temperature: float = 0.4,
        stop_sequences: list[str] | None = None,
        run_cost_budget_usd: float | None = None,
        accumulated_cost_usd: float = 0.0,
    ) -> LLMResponse:
        """Single non-streaming completion. Returns LLMResponse with telemetry.

        If `run_cost_budget_usd` is set and the projected cost would exceed it,
        raises `CostBudgetExceeded` before making the call.
        """
        if self.dry_run:
            return self._dry_run_response(model, system_blocks, user_message)

        if run_cost_budget_usd is not None:
            projected = self._project_cost(model, system_blocks, user_message, max_tokens)
            if accumulated_cost_usd + projected > run_cost_budget_usd:
                raise CostBudgetExceeded(
                    f"Projected cost ${projected:.4f} + accumulated "
                    f"${accumulated_cost_usd:.4f} exceeds budget ${run_cost_budget_usd:.4f}"
                )

        assert self._client is not None
        start = time.perf_counter()
        resp = self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_blocks,
            messages=[{"role": "user", "content": user_message}],
            stop_sequences=stop_sequences or [],
        )
        latency_ms = int((time.perf_counter() - start) * 1000)

        usage = getattr(resp, "usage", None)
        tokens_in = getattr(usage, "input_tokens", 0) if usage else 0
        tokens_out = getattr(usage, "output_tokens", 0) if usage else 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) if usage else 0
        cache_write = getattr(usage, "cache_creation_input_tokens", 0) if usage else 0

        text_parts: list[str] = []
        for block in resp.content:
            if getattr(block, "type", None) == "text":
                text_parts.append(block.text)
        text = "\n".join(text_parts)

        cost = self._compute_cost(model, tokens_in, tokens_out, cache_read, cache_write)
        return LLMResponse(
            text=text,
            model=model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cache_read_tokens=cache_read,
            cache_write_tokens=cache_write,
            cost_usd=cost,
            latency_ms=latency_ms,
            stop_reason=getattr(resp, "stop_reason", None),
        )

    # ---------- helpers ----------

    @staticmethod
    def _compute_cost(
        model: str,
        tokens_in: int,
        tokens_out: int,
        cache_read: int,
        cache_write: int,
    ) -> float:
        rates = PRICING_PER_M_TOKENS.get(model)
        if rates is None:
            return 0.0
        per_token = lambda n, rate: n / 1_000_000.0 * rate
        return (
            per_token(tokens_in, rates["input"])
            + per_token(tokens_out, rates["output"])
            + per_token(cache_read, rates["cache_read"])
            + per_token(cache_write, rates["cache_write"])
        )

    def _project_cost(
        self,
        model: str,
        system_blocks: list[dict[str, Any]],
        user_message: str,
        max_tokens: int,
    ) -> float:
        approx_input = sum(len(b.get("text", "")) for b in system_blocks) + len(user_message)
        approx_input_tokens = approx_input // 4
        return self._compute_cost(model, approx_input_tokens, max_tokens, 0, 0)

    def _dry_run_response(
        self,
        model: str,
        system_blocks: list[dict[str, Any]],
        user_message: str,
    ) -> LLMResponse:
        head = (user_message[:300] + "...") if len(user_message) > 300 else user_message
        body = (
            "[DRY-RUN OUTPUT]\n"
            f"model={model}\n"
            f"system_blocks={len(system_blocks)}\n"
            f"user_message_preview={head!r}\n"
            "\n"
            "{\n"
            "  \"status\": \"ok\",\n"
            "  \"note\": \"This response was generated in dry-run mode. Set GTM_DRY_RUN=0 and provide ANTHROPIC_API_KEY for real calls.\"\n"
            "}\n"
        )
        return LLMResponse(
            text=body,
            model=model,
            tokens_in=len(user_message) // 4,
            tokens_out=len(body) // 4,
            cache_read_tokens=0,
            cache_write_tokens=0,
            cost_usd=0.0,
            latency_ms=1,
            stop_reason="end_turn",
        )

    # ---------- structured-output helper ----------

    @staticmethod
    def parse_json(text: str) -> dict[str, Any] | None:
        """Best-effort extraction of a single JSON object from a response."""
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

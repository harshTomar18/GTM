"""LLMClient dry-run tests."""

from __future__ import annotations

from core.llm_client import LLMClient, PRICING_PER_M_TOKENS


def test_dry_run_returns_synthetic():
    c = LLMClient(dry_run=True)
    resp = c.generate(
        model="claude-sonnet-4-6",
        system_blocks=[{"type": "text", "text": "system"}],
        user_message="Generate a JSON object.",
    )
    assert "DRY-RUN" in resp.text
    assert resp.cost_usd == 0.0
    assert resp.tokens_in > 0


def test_pricing_constants_present():
    for model in ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]:
        assert model in PRICING_PER_M_TOKENS
        rates = PRICING_PER_M_TOKENS[model]
        assert set(rates.keys()) == {"input", "output", "cache_write", "cache_read"}


def test_cost_calc():
    c = LLMClient(dry_run=True)
    cost = c._compute_cost("claude-sonnet-4-6", 1_000_000, 0, 0, 0)
    assert cost == 3.0  # $3/M input

def test_parse_json_extracts():
    blob = "preface text\n{\"hello\": \"world\"}\nfollow-up"
    parsed = LLMClient.parse_json(blob)
    assert parsed == {"hello": "world"}


def test_parse_json_returns_none_on_invalid():
    assert LLMClient.parse_json("not json") is None

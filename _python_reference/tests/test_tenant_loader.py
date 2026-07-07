"""Tenant loader + pack merge tests."""

from __future__ import annotations

from core.tenant_loader import load_tenant, validate_profile_path


def test_load_example_tenant(repo_root):
    profile = load_tenant("_example", repo_root)
    assert profile.profile_id == "_example"
    assert profile.company.brand_name == "Acme"
    assert profile.primary_motion() == "enterprise_abm"
    # Pack should have provided banned phrases that the tenant didn't redeclare
    assert any(p in profile.brand_voice.banned_phrases for p in ["synergy"])


def test_validate_profile_yaml(repo_root):
    path = repo_root / "tenants" / "_example" / "tenant_profile.yaml"
    profile = validate_profile_path(path)
    assert profile.profile_id == "_example"

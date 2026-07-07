"""Tenant + vertical pack loader.

`load_tenant(tenant_id, repo_root)`:
  1. Reads `tenants/<id>/tenant_profile.yaml`.
  2. If `extends:` is set, deep-merges the vertical pack's `profile_defaults.yaml`
     underneath.
  3. Validates the merged dict against `TenantProfile`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from core.schemas.tenant_profile import TenantProfile


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in override.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def _load_pack_defaults(repo_root: Path, extends_path: str) -> dict[str, Any]:
    pack_dir = repo_root / extends_path
    defaults_yaml = pack_dir / "profile_defaults.yaml"
    if not defaults_yaml.exists():
        return {}
    raw = yaml.safe_load(defaults_yaml.read_text(encoding="utf-8")) or {}
    return raw.get("defaults", {}) or {}


def load_tenant(tenant_id: str, repo_root: Path) -> TenantProfile:
    profile_path = repo_root / "tenants" / tenant_id / "tenant_profile.yaml"
    if not profile_path.exists():
        raise FileNotFoundError(f"No tenant_profile.yaml at {profile_path}")
    raw_tenant = yaml.safe_load(profile_path.read_text(encoding="utf-8")) or {}

    extends = raw_tenant.get("extends")
    if extends:
        pack_defaults = _load_pack_defaults(repo_root, extends)
        # Pack defaults seed each top-level key the tenant doesn't override.
        # Deep-merge so nested dicts (brand_voice, etc.) inherit cleanly.
        merged: dict[str, Any] = {}
        for k in set(list(raw_tenant.keys()) + list(pack_defaults.keys())):
            if k in pack_defaults and k in raw_tenant:
                tv = raw_tenant[k]
                pv = pack_defaults[k]
                if isinstance(tv, dict) and isinstance(pv, dict):
                    merged[k] = _deep_merge(pv, tv)
                else:
                    merged[k] = tv
            elif k in raw_tenant:
                merged[k] = raw_tenant[k]
            else:
                merged[k] = pack_defaults[k]
        raw_tenant = merged

    return TenantProfile.model_validate(raw_tenant)


def validate_profile_path(path: Path) -> TenantProfile:
    """Validate a single profile YAML file without merging packs."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return TenantProfile.model_validate(raw)

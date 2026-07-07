---
name: gtm-tenant-init
description: Use this skill when the user wants to onboard a new GTM tenant (e.g. "set up acme as a tenant", "init a new tenant called <id>", "create a tenant for [company]"). It scaffolds tenants/<id>/ by cloning tenants/_example/ and updating the profile_id + pack reference.
---

# Skill: gtm-tenant-init

## Trigger phrases

- "init a new tenant"
- "create a tenant for X"
- "onboard tenant <id>"
- "scaffold a tenant called <id> using the <pack> pack"

## Required inputs

Resolve these before doing any filesystem work. Ask the user only for what's missing.

| Field | Source / default |
|---|---|
| `tenant_id` | User-provided. Kebab/snake case. Must match `^[a-zA-Z0-9_-]+$`. |
| `pack_id` | User-provided OR default to `_template` (warn: real packs ship in Workstream B+). |
| `overwrite` | User-provided OR default to `false`. |

## Steps

1. **Pre-flight:** check that `tenants/<tenant_id>/` does not already exist. If it does and `overwrite=false`, abort with a clear message: `"Tenant directory already exists: tenants/<id>/. Re-run with overwrite=true to replace."`
2. **Copy the example:** copy every file under `tenants/_example/` to `tenants/<tenant_id>/`, preserving structure. Use the `Bash` tool's `cp -r`.
3. **Patch the profile:** open `tenants/<tenant_id>/tenant_profile.yaml` and:
   - Replace `profile_id: _example` with `profile_id: <tenant_id>`
   - Replace `extends: vertical_packs/_template` with `extends: vertical_packs/<pack_id>`
4. **Validate:** invoke `gtm-validate-profile` skill on the new profile path. If validation fails, **do not** delete the new dir — report the error and ask the user to fix.
5. **Report:** print a confirmation block:
   ```
   ✓ Created tenant <tenant_id> at tenants/<tenant_id>/
     Pack: <pack_id>
     Profile: tenants/<tenant_id>/tenant_profile.yaml

   Next steps:
     - Edit tenants/<tenant_id>/tenant_profile.yaml to fill in real data
     - Add baseline files under tenants/<tenant_id>/baseline/
     - Run /gtm-cycle-start tenant=<tenant_id> cycle=<id> --dry-run
   ```

## Audit

Append one record to `governance/audit_log.jsonl`:

```json
{"ts":"<iso>","event":"tenant.initialized","actor":"user","subject_type":"tenant","subject_id":"<tenant_id>","rationale":"pack=<pack_id>"}
```

## Failure modes

- **Missing example template:** error if `tenants/_example/` is gone. Suggest restoring from git.
- **Invalid tenant_id:** reject before copying; show the pattern.
- **Pack doesn't exist:** warn but proceed (the tenant can still be edited).

## Do NOT

- Don't run any Python or shell scripts that require a binary not pre-installed on the box.
- Don't ask permission to overwrite — the user supplied `overwrite` explicitly.
- Don't write tenant ids that contain spaces or non-ASCII.

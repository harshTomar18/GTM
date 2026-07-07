---
name: gtm-validate-profile
description: Use this skill when the user wants to validate a tenant_profile.yaml against the TenantProfile schema. Triggered by "validate profile", "check the tenant config", "is this profile valid", or invoked by other skills (e.g. after gtm-tenant-init).
---

# Skill: gtm-validate-profile

## What it does

Loads a `tenant_profile.yaml`, deep-merges its `extends:` Vertical Pack defaults, and
checks the result against `schemas/tenant_profile.schema.json`. Reports specific
violations or confirms validity with a summary.

## Required inputs

| Field | Source / default |
|---|---|
| `profile_path` | User-provided, else infer from `tenant_id` (= `tenants/<id>/tenant_profile.yaml`) |

## Steps

1. **Read the profile YAML** at `profile_path`. If missing, error with the path.
2. **Read the pack defaults** at `<extends>/profile_defaults.yaml` if `extends:` is set. If the path doesn't exist, warn but continue with the raw tenant YAML.
3. **Deep merge** pack `defaults` underneath tenant fields (tenant wins on conflicts).
4. **Read the schema** at `schemas/tenant_profile.schema.json`.
5. **Validate** the merged dict against the schema. Check:
   - All `required` keys present at each object level.
   - `profile_id` matches `^[a-zA-Z0-9_-]+$`.
   - `version` is `2`.
   - `lob[].motion` is one of the allowed values.
   - `icp_archetypes[].committee_complexity` ∈ {low, medium, high, extreme}.
   - `brand_voice.banned_phrases` is a list of strings.
   - `approval_roles[].role` strings are non-empty.
6. **Report:** if valid, print a summary including: profile_id, brand_name, primary motion (from LOB max weight), primary ICP id, frameworks, language defaults. If invalid, print the field path and constraint violated.

## Output format

**Valid:**
```
✓ Profile valid: <profile_id> (<brand_name>)
   Primary motion: <motion>
   Primary ICP: <icp_id>
   Frameworks: <comma-joined or "(none)">
   Languages: <default> (supported: <list>)
```

**Invalid:**
```
✗ Profile invalid: <count> issues
   - <field path>: <constraint violated>
   - …
```

## Do NOT

- Don't fix the YAML yourself — only report issues. The user (or `gtm-tenant-init`) decides next steps.
- Don't read or report any other tenant's profile.

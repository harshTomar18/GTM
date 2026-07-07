---
description: Validate a tenant_profile.yaml against the TenantProfile schema.
argument-hint: <tenant_id> | path=<path>
---

Arguments: $ARGUMENTS

If a single positional value is given, treat it as `tenant_id` and resolve the profile path to `tenants/<id>/tenant_profile.yaml`. If `path=<path>` is given, use that absolute or relative path.

Invoke the **gtm-validate-profile** skill with the resolved path. Report the result.

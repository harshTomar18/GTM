---
description: Onboard a new GTM tenant by scaffolding tenants/<id>/ from the example.
argument-hint: tenant=<id> [pack=<pack_id>] [overwrite=true]
---

Parse the arguments below (key=value pairs). Then invoke the **gtm-tenant-init** skill.

Arguments: $ARGUMENTS

Required: `tenant=<id>`. Optional: `pack=<pack_id>` (default `_template`), `overwrite=true|false` (default `false`).

After the skill completes, invoke **gtm-validate-profile** on the new profile path to confirm it's valid.

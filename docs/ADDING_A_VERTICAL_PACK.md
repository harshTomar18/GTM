# Adding a Vertical Pack

A Vertical Pack is a reusable bundle of industry defaults that a tenant inherits via
the `extends:` field in `tenant_profile.yaml`. Adding a new pack is the most
common extension you'll do.

---

## When to add a pack

Add a new pack when:
- You're onboarding the first tenant in a vertical (Healthcare, BFSI, Manufacturing,
  SaaS PLG, Cyber, …).
- You have 3+ tenants that share an industry and you're duplicating fields across
  their profiles — that duplication should be in a pack.

Don't add a pack for one-off customizations. Use the tenant_profile.yaml.

---

## Step-by-step

### 1. Copy the template

```
cp -r vertical_packs/_template vertical_packs/<your_pack_id>
```

Pack IDs are snake_case: `saas_plg`, `healthcare_provider`, `manufacturing_industrial`,
`bfsi_regulated`, `government_public_sector`.

### 2. Fill in `profile_defaults.yaml`

```yaml
pack_id: saas_plg
pack_version: "1.0.0"
description: "SaaS product-led growth — freemium conversion, dev/champion personas"

supported_motions:
  - plg
  - hybrid

defaults:
  brand_voice:
    reading_level: grade_10
    tone:
      - direct
      - product-first
      - developer-friendly
    banned_phrases:
      - synergy
      - revolutionary
      - cutting-edge
      - enterprise-grade  # PLG should not lead with this
      # ...
  operating_calendar:
    cycle_length: monthly       # PLG moves faster than enterprise

prompt_fragments:
  - prompt_fragments/plg_motion.md

claim_library_path: claim_library.yaml
banned_claims_path: banned_claims.yaml
```

### 3. Add prompt fragments (optional but powerful)

Pack-specific prompt fragments get injected into block 1 of every agent's prompt
cache (after the universal profile header). They're how you teach Claude about
vertical-specific frameworks, vocabulary, and posture.

Example `vertical_packs/saas_plg/prompt_fragments/plg_motion.md`:

```markdown
# PLG Motion Guidance

This tenant operates a Product-Led Growth motion. When generating content,
positioning, or messaging:

- Lead with the user, not the buyer. The user IS the buyer most of the time.
- Reference activation metrics (time-to-value, aha moment, retention week 4)
  rather than enterprise sales metrics (ACV, win rate).
- Personas typically include: builder, individual contributor, team lead, champion.
- Distribution channels skew toward developer communities (HN, GitHub, dev.to,
  Reddit subreddits), product launches (Product Hunt), and viral loops.
- Avoid procurement-heavy language (RFP, MSA, SOW) unless explicitly in the
  enterprise tier conversation.
```

### 4. Add the claim and banned-claim libraries

`vertical_packs/saas_plg/claim_library.yaml`:

```yaml
claims:
  - claim: "Customers see <metric> within <time>."
    citation: "(tenant must supply real numbers in tenant_profile or per-asset)"
    notes: "Always backed by a customer logo or anonymized case"
```

`vertical_packs/saas_plg/banned_claims.yaml`:

```yaml
banned:
  - "the best <category>"
  - "more secure than <competitor>"     # except with side-by-side audit references
  - "guaranteed <outcome>"
```

For regulated packs (BFSI, healthcare), these are critical:

```yaml
banned:
  - "guaranteed returns"
  - "FDA approved"          # unless we truly are
  - "100% compliant"
  - "no risk"
```

### 5. Wire a tenant to the pack

In any `tenants/<id>/tenant_profile.yaml`:

```yaml
extends: vertical_packs/saas_plg
```

The pack's `defaults` deep-merge underneath the tenant fields. Tenant wins on every
conflict; the pack only fills in fields the tenant didn't specify.

### 6. Validate

```
/gtm-validate-profile <tenant_id>
```

If the pack provides a field the tenant didn't, it should show up in the
validation summary.

### 7. Document the pack

Add a `vertical_packs/<pack_id>/README.md`:

```markdown
# Pack: <name>

**Motions:** PLG, hybrid
**Typical tenants:** seed-to-Series B SaaS, dev tools, API products
**Frameworks:** activation funnels, NPS, week-4 retention

## What this pack provides

- Reading-level default `grade_10`.
- 14 banned phrases focused on enterprise-y language.
- `plg_motion.md` prompt fragment that re-anchors Claude on PLG dynamics.
- Empty claim_library (PLG tenants must supply their own — claims are
  product-specific).

## What this pack does NOT provide

- Buying committee templates (PLG doesn't have committees in the traditional sense).
- Regulatory disclaimers.
- Enterprise sales cycle assumptions.

## Tenants currently using

- (list of tenant_ids, updated manually for reference)
```

---

## Pack design principles

1. **Defaults, not overrides.** A pack is the foundation. Tenants should never have
   to fight against a pack's defaults — if they do, that field belongs in the tenant
   profile, not the pack.
2. **Verticals, not features.** Don't make a "video pack" or a "events pack" —
   those are LOB/motion mods, which go in `lob_packs/` or `motion_packs/`. Verticals
   are industries: Healthcare, BFSI, Manufacturing, SaaS, Cyber, …
3. **Banned phrases are sacred.** Every pack should ship with at least 10 banned
   phrases. They're the first line of defense against generic LLM slop.
4. **Frameworks live in the pack.** If your vertical has authority anchors (NIST,
   HIPAA, GAAP, ISO 27001, IEC 62443), they go in `defaults.frameworks` here.
5. **Prompt fragments stay short.** A 200-word fragment that teaches Claude one
   vertical truth beats a 2000-word fragment that tries to capture the whole industry.
6. **Version the pack.** Bump `pack_version` on every meaningful change. Tenants can
   pin to a specific version if they want stability:
   `extends: vertical_packs/saas_plg@1.2.0` (the version pinning convention; the loader
   ignores the `@version` suffix in Workstream A and uses the latest).

---

## Recommended initial packs to build

Listed in priority order. Each is a separate piece of work — don't try to ship them
all at once.

| # | Pack | Defining traits |
|---|---|---|
| 1 | `saas_plg` | PLG metrics, dev personas, freemium conversion, viral distribution |
| 2 | `bfsi_regulated` | NYDFS, SOX, FFIEC, formal proof requirements, longer cycles |
| 3 | `healthcare_provider` | HIPAA, HITRUST, payer-provider committee, evidence-grade content |
| 4 | `manufacturing_industrial` | OT/IT convergence, IEC 62443, channel distribution, plant-floor personas |
| 5 | `government_public_sector` | FedRAMP, FISMA, GSA schedules, lengthy procurement, mission language |
| 6 | `cyber_b2b_enterprise` | NIST CSF, MITRE, Zero Trust, CISO committee — build this fresh, don't migrate the legacy cyber instance |

Each pack should ship with: `profile_defaults.yaml`, one or more prompt fragments,
a populated banned_claims, an empty claim_library template, and a README.

---
name: gtm-regulatory-lint
description: Automated regulatory compliance linter that checks artifacts for jurisdiction-specific disclaimers, prohibited claims, and required disclosures based on the tenant's regulatory_constraints config. Invoked by gtm-agent-run alongside brand-validator and claim-checker. Blocks submission on FAIL — never auto-remediates regulatory issues.
---

## What it does

Applies tenant-declared regulatory rules to artifact prose:

1. **Disclaimer presence check** — for each `regulatory_constraints[].required_disclaimers[]` in the tenant profile, verifies the disclaimer text (or a semantically equivalent version) appears in the artifact. Missing → FAIL.
2. **Prohibited claim scan** — for each `regulatory_constraints[].prohibited_claims[]`, checks if the artifact contains that phrase or close variant. Present → FAIL.
3. **Content-review flag** — if `regulatory_constraints[].content_review_required: true` for any constraint that applies to this artifact_type, sets `requires_legal_review: true` in the result (triggers `legal_regulated` approval policy).
4. **Jurisdiction-specific rules** — reads `regulatory_constraints[].jurisdiction[]` (e.g., "US", "EU", "UK"). If artifact's intended_markets intersects the jurisdiction, applies that constraint set. Cross-border artifacts must satisfy the union of all applicable sets.
5. **Financial claim check** — if `profile.regulatory_constraints` contains any `type: financial_services`, scans for forward-looking statements without "past performance" disclaimer → FAIL.

---

## Inputs

| Field | Description |
|---|---|
| `artifact_text` | The full prose content of the artifact to be linted |
| `artifact_type` | Type of artifact (e.g., `website_copy`, `email_sequences`, `paid_ad_creative`) |
| `intended_markets[]` | List of target markets from campaign_calendar or agent context (e.g., `["US", "EU"]`) |
| `profile.regulatory_constraints[]` | Tenant-declared constraint objects from tenant profile |
| `artifact_ref` | Unique artifact reference string for audit logging |

---

## Steps

1. **Identify applicable constraint sets:** filter `profile.regulatory_constraints[]` where `jurisdiction[]` intersects `intended_markets[]`.
2. **For each applicable constraint:**
   a. Check `required_disclaimers` — fuzzy string match (allows paraphrase within 80% similarity).
   b. Check `prohibited_claims` — exact + fuzzy match.
   c. Flag `content_review_required` if set on this constraint and the current `artifact_type` is in `applies_to_artifact_types[]` (or if that field is absent, apply universally).
3. **Compose `RegulatoryLintResult`:**
   ```json
   {
     "passed": true | false,
     "missing_disclaimers": [],
     "prohibited_hits": [],
     "requires_legal_review": true | false,
     "applicable_jurisdictions": [],
     "warnings": []
   }
   ```
4. **Audit log:** emit `artifact.regulatory_linted` event with artifact_ref, result (pass/fail), applicable_jurisdictions, and requires_legal_review. Never log prohibited claim phrase content verbatim if it contains sensitive data.

---

## Pass/fail logic

- `passed: true` iff: `missing_disclaimers` is empty AND `prohibited_hits` is empty.
- `requires_legal_review: true` does NOT set `passed: false` — it enriches the policy-match result so `gtm-policy-match` adds Legal to the approval chain.
- On FAIL: **NEVER auto-redo** for regulatory failures. Instead, block with `ESCALATE_TO_HUMAN` and message:

  > "Regulatory lint failed: {failures}. A human must fix these before resubmission — auto-redo is disabled for compliance issues."

---

## Output (caller perspective)

Passing example:
```
[regulatory-lint] artifact_ref=phase3.email_sequences.nurture_seq_1
   Applicable jurisdictions: EU, US
   ✓ CAN-SPAM footer present
   ✓ GDPR opt-out language detected
   ✓ No prohibited claims
   ⚑ content_review_required: true → Legal added to approval chain
   RESULT: PASSED (with Legal review required)
```

Failing example:
```
[regulatory-lint] artifact_ref=phase3.paid_ad_creative.linkedin_campaign
   Applicable jurisdictions: US (financial_services)
   ✗ Missing disclaimer: "Past performance does not guarantee future results"
   RESULT: FAILED → ESCALATE_TO_HUMAN (no auto-redo)
```

---

## Do NOT

- Don't auto-redo regulatory failures — regulatory compliance is not a style issue. A human must confirm the fix.
- Don't infer jurisdiction from company name alone — use `intended_markets[]` from the artifact context.
- Don't apply a constraint if `regulatory_constraints[].applies_to_artifact_types[]` is set and the current `artifact_type` is not in the list.
- Don't suppress `requires_legal_review: true` even if `content_review_required` is false globally — check per-constraint.

---

## Workstream status

- **A/B/C:** not enforced (lint passes trivially — no constraint data).
- **D:** enforcement active. Tenants with `regulatory_constraints` get this check on every submission.

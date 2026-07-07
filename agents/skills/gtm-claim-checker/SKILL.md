---
name: gtm-claim-checker
description: Automated factual-integrity check that runs on every artifact before it reaches a human approver. Verifies that every quantitative claim, named framework, customer reference, and competitive assertion traces to a citation in the artifact's sources[] array. Invoked by gtm-agent-run alongside gtm-brand-validator.
---

## What it does

Runs four check passes on an artifact's prose content:

1. **Numeric claim scan** — extracts all numeric assertions (percentages, dollar amounts, time periods, counts) from artifact prose using pattern matching. Each numeric claim must appear in `artifact.sources[]` with a `source_url` or `source_id`. Unmatched → FAIL.
2. **Framework citation check** — for each framework in `profile.frameworks[]` mentioned in the artifact, verifies a supporting source exists in `artifact.sources[]`. Framework mentioned without citation → FAIL.
3. **Customer/logo reference check** — if the artifact contains customer names or logos (matched against `profile.approved_customer_references[]`), each must have an `approved: true` flag in the reference list. An unapproved customer reference does not auto-fail; it escalates to the `customer_named` policy (requiring Legal + CustomerSuccess approval).
4. **Competitive assertion check** — any comparative claim ("better than", "faster than", "unlike Competitor X", "outperforms", "compared to", "vs.") must cite a source in `artifact.sources[]`. Uncited → FAIL.

---

## Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `artifact_text` | string | yes | The full prose text of the artifact (not subject lines, headlines < 15 words, or social hooks — see Do NOT). |
| `artifact_sources[]` | array | yes | The `sources` array from the artifact JSON. Each entry should have at minimum `source_id` or `source_url` plus a `claim_excerpt` or `context` field for fuzzy matching. |
| `profile` | TenantProfile | yes | Used to resolve `profile.frameworks[]` and `profile.approved_customer_references[]`. |
| `artifact_ref` | string | yes | ContextBus key for the artifact, used in the audit log entry. |

---

## Steps

1. **Extract numeric claims**: apply regex pattern `\d+[\.,]?\d*\s*(%|percent|x|X|\$|USD|days|hours|weeks|months|minutes)` and similar locale-aware variants against `artifact_text`. Also capture numeric claims followed by contextual qualifiers (e.g., "3x faster", "40% reduction"). Collect into `numeric_claims[]`.
2. **Cite-match numeric claims**: for each entry in `numeric_claims[]`, search `artifact_sources[]` for a matching entry using fuzzy match on the claim value plus a ±20-word context window from the artifact text. Claims marked explicitly as "(illustrative)" in the prose are excluded from this check. Unmatched claims go into `uncited_numerics[]`.
3. **Extract framework mentions**: iterate `profile.frameworks[]` (case-insensitive substring match) against `artifact_text`. For each matched framework, check that at least one entry in `artifact_sources[]` references it. Unmatched framework mentions go into `uncited_frameworks[]`.
4. **Extract customer/company references**: apply NER heuristics (capitalized proper nouns appearing in "customer", "client", "case study", "partner", or logo-list context within `artifact_text`). Cross-reference each detected name against `profile.approved_customer_references[]`. Names not found or found with `approved: false` go into `unapproved_customers[]`.
5. **Detect comparative language**: search `artifact_text` for patterns: `better than`, `faster than`, `outperforms`, `unlike [A-Z]`, `compared to`, `vs\.`, `superior to`, `more .+ than`. For each match, check `artifact_sources[]` for a supporting citation within ±30-word context. Unmatched comparatives go into `uncited_comparatives[]`.
6. Compose `ClaimCheckResult`:
   ```json
   {
     "passed": bool,
     "uncited_numerics": [],
     "uncited_frameworks": [],
     "unapproved_customers": [],
     "uncited_comparatives": [],
     "warnings": []
   }
   ```
7. Set `passed` and populate `warnings[]` per the pass/fail logic below.
8. If `unapproved_customers` is non-empty, emit a policy escalation event to ContextBus: `policy.customer_named_triggered`, with the list of unapproved names and `artifact_ref`. Do not set `passed: false` for this condition alone.
9. Append audit log entry to ContextBus: event `artifact.claim_checked`, fields `{ artifact_ref, result: "pass" | "fail", uncited_numerics_count, uncited_frameworks_count, uncited_comparatives_count, unapproved_customers_count, timestamp }`.
10. Return `ClaimCheckResult` to the caller (gtm-agent-run).

---

## Pass/fail logic

- `passed: true` iff: `uncited_numerics` is empty **AND** `uncited_frameworks` is empty **AND** `uncited_comparatives` is empty.
- `unapproved_customers` is non-empty → does **not** set `passed: false`. Instead triggers the `customer_named` approval policy (Legal + CustomerSuccess sign-off required). Added to `warnings[]` with policy escalation note.
- On FAIL: gtm-agent-run triggers auto-redo. The `revision_brief` passed to the agent is:
  > "Claim check failed: {uncited_numerics + uncited_frameworks + uncited_comparatives}. Add citations to artifact.sources[] for all flagged claims, or remove unsupported assertions."

---

## Output (caller perspective)

Pass example:
```
[claim-checker] artifact_ref=phase3.content_assets.pillar_article_1
   ✓ 3 numeric claims — all cited
   ✓ Frameworks (<framework_a>, <framework_b>) — cited
   ✓ No uncited comparative assertions
   RESULT: PASSED
```

Fail example:
```
[claim-checker] artifact_ref=phase3.content_assets.pillar_article_1
   ✓ 3 numeric claims — all cited
   ✓ Frameworks (<framework_a>, <framework_b>) — cited
   ✗ Uncited comparative: "reduces processing time by 60% faster than manual review"
   RESULT: FAILED → auto-redo triggered
```

Customer escalation (non-blocking):
```
[claim-checker] artifact_ref=phase3.content_assets.pillar_article_1
   ⚠ Unapproved customer reference: "<Customer Name>" → customer_named policy triggered (Legal + CS approval required)
   RESULT: PASSED (pending customer_named policy resolution)
```

---

## Do NOT

- Don't fail on round numbers used as illustrative examples when explicitly marked "(illustrative)" in the text — these are intentionally uncited.
- Don't check citations within the `sources[]` array itself — only check that prose claims in `artifact_text` are backed by entries in `sources[]`.
- Don't treat internal ContextBus keys (e.g., `cycle.phase3.brief`) as valid external citations for numeric claims. Only `source_url` or externally resolvable `source_id` values count.
- Don't run on email subject lines, headlines fewer than 15 words, or social post hooks — these are too short to require inline citation. The citation obligation lives in the full asset body, not the hook.

---

## Workstream status

| Workstream | Enforcement |
|---|---|
| A | Not enforced. Checks pass trivially. |
| B | Not enforced. Checks pass trivially. |
| C | Not enforced. Checks pass trivially. |
| **D** | **Enforcement active** on all Phase 3, Phase 4, and Phase 5 artifacts. Every artifact runs this check alongside gtm-brand-validator before reaching a human approver. |

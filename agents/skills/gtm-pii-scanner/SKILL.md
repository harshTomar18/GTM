---
name: gtm-pii-scanner
description: PII detection scanner that checks all artifact text and structured fields for personally identifiable information before publication or approval routing. Blocks submission on ANY PII detection — never auto-publishes PII. Invoked by gtm-agent-run as the final quality gate before gtm-policy-match.
---

## What it does

Scans artifact text and structured JSON fields for PII using pattern matching and LLM-assisted heuristics:

### Pattern-match passes (deterministic)

| PII Type | Pattern |
|---|---|
| Email addresses | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` |
| Phone numbers (US/CA) | `(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}` + international variants |
| SSN | `\d{3}-\d{2}-\d{4}` |
| Credit card | `\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}` |
| IP addresses | `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}` (flag only in personal-data contexts) |
| Street addresses | Heuristic pattern: number + street name + city/state/zip |

### LLM-assisted passes (haiku)

- **Named individuals:** "Does this text contain full names of specific private individuals (not public figures or companies)? Return JSON: `{found: bool, instances: [str]}`."
- **Medical information:** "Does this text contain health, diagnosis, or treatment information about a specific individual? Return JSON: `{found: bool, instances: [str]}`."
- **Financial account details:** Personal account numbers, routing numbers, personal financial data.

---

## Inputs

| Field | Description |
|---|---|
| `artifact_text` | Full prose content of the artifact |
| `artifact_json` | Full artifact payload for structured field scanning |
| `artifact_ref` | Unique artifact reference string for audit logging |
| `profile.compliance.pii_scope` | Optional; scoping filter. Default: scan all fields |

---

## Steps

1. Run all **pattern-match passes** on `artifact_text` + `stringify(artifact_json)`.
2. Run **LLM-assisted passes** (haiku) on `artifact_text` only (not raw JSON — cost-prohibitive at scale).
3. Collect `pii_findings[]`: each finding has:
   ```json
   {
     "pii_type": "email | phone | ssn | credit_card | ip | address | named_individual | medical | financial_account",
     "redacted_sample": "...last 4 chars only",
     "location": "field_path or text offset ~N",
     "confidence": "high | medium"
   }
   ```
4. Compose `PIIScanResult`:
   ```json
   {
     "passed": true | false,
     "pii_findings": [],
     "high_confidence_count": 0,
     "medium_confidence_count": 0
   }
   ```
5. **Audit log:** emit `artifact.pii_scanned` with artifact_ref and result (pass/fail, counts). **NEVER log the actual PII values** — only log finding type + confidence.

---

## Pass/fail logic

- `passed: true` iff: zero high-confidence findings AND zero medium-confidence findings.
- **On FAIL (any confidence level):** HARD BLOCK — artifact is quarantined, not submitted to the approval queue. Message:

  > "PII detected in artifact. Submission blocked. Human must review and remove PII before resubmission. DO NOT auto-redo — redo may perpetuate PII."

  After human clears, the operator manually re-runs the agent.

- **On medium-confidence only** (e.g., a person's name that might be a company name): block with advisory and ask human to confirm before resubmission.

---

## Output (caller perspective)

Passing example:
```
[pii-scanner] artifact_ref=phase3.email_sequences.prospect_outbound_1
   ✓ No email addresses detected
   ✓ No phone numbers detected
   ✓ No SSN/financial PII detected
   ✓ Named individuals: none (LLM check)
   RESULT: PASSED
```

Failing example:
```
[pii-scanner] artifact_ref=phase3.email_sequences.prospect_outbound_1
   ✗ Email address detected (high confidence) at prose offset ~340
   ✗ Named individual (high confidence): "[REDACTED]" — likely private individual
   RESULT: FAILED → HARD BLOCK (no auto-redo, no approval routing)
```

---

## Do NOT

- Don't log actual PII values in `audit_log.jsonl` — only log finding type + confidence.
- Don't use pattern matches alone to block — always cross-check with LLM pass for medium-confidence patterns (e.g., "555-1234" might not be a real phone number in a fictional example).
- Don't scan `tenant_profile.yaml` itself — profiles legitimately contain approver PII (emails, names). Scope is outbound artifacts only.
- Don't auto-redo on PII detection — redo without human correction may re-introduce the same PII.
- Don't pass artifacts with any high-confidence PII finding, regardless of context.

---

## Workstream status

- **A/B/C:** not enforced.
- **D:** enforcement active. All Phase 3/4/5 artifacts are scanned before approval routing.
- **Multi-tenant note:** PII scan results are per-tenant isolated — never cross-tenant.

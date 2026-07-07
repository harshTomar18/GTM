---
name: gtm-brand-validator
description: Automated brand-consistency check that runs on every artifact before it reaches a human approver. Validates brand voice adherence, banned-phrase detection, must-say coverage, and tone fidelity against the tenant's brand_voice config. Invoked by gtm-agent-run after the self_review stage and before gtm-policy-match.
---

## What it does

Runs four checks on an artifact's text content:

1. **Banned-phrase scan** — searches for any phrase in `profile.brand_voice.banned_phrases[]` (case-insensitive). Each hit is a FAIL.
2. **Must-say coverage** — checks that each phrase in `profile.brand_voice.must_say_phrases[]` (or the cycle's NarrativeLockDoc.must_say[]) appears at least once. Each missing phrase is a WARN (not FAIL unless the agent's rubric weights it as required).
3. **Tone fidelity score** — asks an LLM judge (claude-haiku) to score the artifact against `profile.brand_voice.tone_descriptors[]` on a 0–1 scale. Score < `profile.brand_voice.fidelity_threshold` (default 0.75) → FAIL.
4. **Reading level check** — if `profile.brand_voice.reading_level` is set, computes approximate Flesch-Kincaid grade via sentence/word/syllable heuristics. Grade > profile level + 2 → WARN.

---

## Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `artifact_text` | string | yes | The full text of the artifact (prose content fields only — not schema envelope or frontmatter). |
| `profile` | TenantProfile | yes | The tenant profile object; must include `brand_voice` block. |
| `narrative_lock` | NarrativeLockDoc | no | If present, `NarrativeLockDoc.must_say[]` supersedes `profile.brand_voice.must_say_phrases[]` for must-say coverage. |
| `artifact_ref` | string | yes | ContextBus key for the artifact, used in the audit log entry. |

---

## Steps

1. Load `profile.brand_voice` from the tenant profile passed by the caller.
2. Resolve the must-say list: if `narrative_lock` is present and `narrative_lock.must_say[]` is non-empty, use that list; otherwise use `profile.brand_voice.must_say_phrases[]`.
3. Run **banned-phrase scan**: iterate `profile.brand_voice.banned_phrases[]`, perform case-insensitive string search against `artifact_text`. Collect all matching phrases into `banned_hits[]`.
4. Run **must-say coverage**: for each phrase in the resolved must-say list, check that it appears at least once (case-insensitive) in `artifact_text`. Collect missing phrases into `missing_must_say[]`.
5. Run **tone fidelity judge**: call claude-haiku with the prompt — "Score 0–1 how well this text embodies these tone descriptors: {{ tone_descriptors }}. Return JSON: {score: float, rationale: str}" — passing `profile.brand_voice.tone_descriptors[]` and `artifact_text`. Parse the JSON response; store as `tone_score` and `tone_rationale`.
6. Run **reading level check** (only if `profile.brand_voice.reading_level` is set): compute approximate Flesch-Kincaid grade using sentence count, word count, and syllable-count heuristics on `artifact_text`. Store as `reading_level_grade`. If `reading_level_grade > profile.brand_voice.reading_level + 2`, add a WARN to `warnings[]`.
7. Compose `BrandValidationResult`:
   ```json
   {
     "passed": bool,
     "banned_hits": [],
     "missing_must_say": [],
     "tone_score": float,
     "tone_rationale": str,
     "reading_level_grade": float | null,
     "warnings": [],
     "failures": []
   }
   ```
8. Populate `failures[]`: add an entry for each banned phrase hit; add an entry if `tone_score < fidelity_threshold`.
9. Set `passed: true` iff `banned_hits` is empty AND `tone_score >= fidelity_threshold`.
10. Append audit log entry to ContextBus: event `artifact.brand_validated`, fields `{ artifact_ref, result: "pass" | "fail", banned_hits_count, tone_score, missing_must_say_count, timestamp }`.
11. Return `BrandValidationResult` to the caller (gtm-agent-run).

---

## Pass/fail logic

- `passed: true` iff: `banned_hits` is empty **AND** `tone_score >= fidelity_threshold`.
- `missing_must_say` is non-empty → adds to `warnings[]` only. Does **not** set `passed: false` unless the agent's rubric explicitly marks those phrases as required (in which case the agent converts them to failures before invoking this skill).
- Reading level overage → WARN only, never FAIL.
- On FAIL: gtm-agent-run triggers auto-redo. The `revision_brief` passed to the agent is:
  > "Brand validation failed: {failures}. Revise to eliminate banned phrases and restore tone fidelity."

---

## Output (caller perspective)

Pass example:
```
[brand-validator] artifact_ref=phase3.website_copy.hero
   ✓ No banned phrases detected
   ✓ Tone score: 0.87 (threshold 0.75)
   ⚠ Missing must-say: "zero-compromise security" (warning only)
   RESULT: PASSED
```

Fail example:
```
[brand-validator] artifact_ref=phase3.website_copy.hero
   ✗ Banned phrases: ["leverage"] (1 hit)
   ✗ Tone score: 0.61 (below threshold 0.75)
   RESULT: FAILED → auto-redo triggered
```

---

## Do NOT

- Don't run on structured JSON fields (schema envelope, frontmatter YAML blocks) — only on prose text content fields extracted from the artifact.
- Don't flag technical terminology that appears in `profile.brand_voice.approved_technical_terms[]` as a banned-phrase hit, even if the term phonetically matches a banned phrase.
- Don't block submission if the only non-passing condition is `missing_must_say` warnings — that is human judgment at approval time.
- Don't cache the tone-fidelity LLM call across different artifacts — always issue a fresh call. The haiku call is cheap; stale cached scores create false assurance.

---

## Workstream status

| Workstream | Enforcement |
|---|---|
| A | Not enforced. Validation passes trivially — no `profile.brand_voice` data available. |
| B | Not enforced. Same as A. |
| C | Not enforced. Same as A. |
| **D** | **Enforcement active.** Every artifact runs this check before reaching a human approver. Failures block submission and trigger auto-redo. |

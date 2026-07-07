# Prompt CI Reference — promptfoo + Prompt Registry

## Overview

The system enforces prompt quality via two mechanisms:

1. **Prompt registry** (`prompts/_registry.yaml`) — every agent is pinned to a specific prompt version. gtm-agent-run checks the registry before running and refuses if the agent's prompt is not pinned.
2. **promptfoo evaluations** — golden-set regression tests run against every prompt change in CI.

---

## How prompt versioning works

Each prompt file has a semver header comment at the top:

```markdown
<!-- prompt_version: 1.2.0 -->
<!-- changelog: Added regulatory disclaimer injection for financial_services tenants -->
```

The registry entry:

```yaml
agents:
  phase3.website_copy:
    prompt: "agents/phase3_assets/website_copy/prompt.md@1.2.0"
    model: "claude-opus-4-7"
    changelog_ref: "CHANGELOG#website_copy-1.2.0"
```

---

## Registry enforcement in gtm-agent-run

When `gtm-agent-run` prepares to run an agent, it:

1. Reads the agent's slug from `agent_spec.yaml`.
2. Looks up the slug in `prompts/_registry.yaml`.
3. If not found → HARD FAIL: "Agent `<slug>` is not registered in `prompts/_registry.yaml`. Add an entry before running."
4. If found, validates the `@version` suffix in the prompt path matches the `<!-- prompt_version: -->` header inside the file.
5. Version mismatch → HARD FAIL: "Prompt version mismatch for `<slug>`: registry says 1.2.0 but file header says 1.3.0. Update the registry."
6. Model field must be a pinned model ID (no "latest" aliases) → HARD FAIL if alias detected.

---

## Adding or updating a prompt

1. Edit the prompt file.
2. Bump the `<!-- prompt_version: -->` semver header (patch for wording, minor for new section, major for structural change).
3. Update `prompts/_registry.yaml` with the new version + changelog_ref.
4. Add a CHANGELOG entry.
5. Run `promptfoo eval --config evals/promptfoo.yaml --agent <slug>` locally.
6. PR must include eval delta report — regressions > 1σ block merge.

---

## promptfoo configuration

File: `evals/promptfoo.yaml` (scaffold — operators populate golden sets):

```yaml
# evals/promptfoo.yaml
version: 1
description: "Universal GTM OS — prompt regression suite"

providers:
  - id: anthropic:claude-sonnet-4-6
    config:
      max_tokens: 4096

prompts:
  - file://agents/phase1_research/brief_intake/prompt.md
  - file://agents/phase2_narrative/positioning/prompt.md
  # ... add all agent prompts

tests:
  - description: "brief_intake produces required research questions"
    vars:
      profile: file://tenants/_example/tenant_profile.yaml
      inputs:
        answers:
          q_campaign_objective: "Land 5 healthcare enterprise accounts"
    assert:
      - type: contains
        value: "research_questions"
      - type: javascript
        value: "output.research_questions.market.length >= 3"
      - type: rubric
        value: "The brief intake output covers market, competitor, audience, and language research questions"
        threshold: 0.8
```

---

## Golden set structure

```
evals/
├── promptfoo.yaml          ← main config
├── golden_sets/
│   ├── phase1.brief_intake/
│   │   ├── case_01_b2b_saas.yaml
│   │   ├── case_02_healthcare.yaml
│   │   └── case_03_manufacturing.yaml
│   ├── phase2.positioning/
│   │   └── ...
│   └── ...
└── rubrics/
    ├── brand_voice.yaml
    ├── citation_density.yaml
    ├── persona_alignment.yaml
    └── claim_traceability.yaml
```

Each golden set case:

```yaml
# case_01_b2b_saas.yaml
description: "Brief intake — SaaS PLG tenant"
profile: file://tenants/_example/tenant_profile.yaml
inputs:
  answers:
    q_campaign_objective: "Reduce time-to-value for self-serve signups"
    q_timeline_weeks: 12
expected:
  schema: BriefIntake:v1
  min_research_questions: 15
  rubric_threshold: 0.80
```

---

## CI integration (GitHub Actions reference)

```yaml
# .github/workflows/prompt-ci.yml (reference only — not executable in Claude Code runtime)
name: Prompt CI
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install promptfoo
        run: npm install -g promptfoo
      - name: Run evals
        run: promptfoo eval --config evals/promptfoo.yaml --output evals/results/ci-${{ github.sha }}.json
      - name: Check for regressions
        run: node scripts/check_eval_regression.js evals/results/ci-${{ github.sha }}.json
```

---

## Workstream status

- **A/B/C:** `prompts/_registry.yaml` exists with stub entries. Enforcement not active.
- **D:** Registry enforcement active in gtm-agent-run. promptfoo config scaffold present. Golden sets populated per agent as they ship.

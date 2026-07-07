---
name: gtm-localization
description: Localize any GTM artifact from the source locale to one or more target locales. Uses DeepL for translation + a glossary-enforced LLM tone-polish pass. Invoked by gtm-agent-run when profile.languages has multiple entries and the user has confirmed localization scope. Also invokable directly: "localize <artifact_ref> to <locale>".
---

## What it does

Two-stage localization pipeline:

1. **Translation pass** — translates artifact prose via DeepL API (configured in `integrations.deepl.api_key_env_var`). Non-prose fields (JSON keys, URL slugs, schema fields) are not translated.
2. **Tone-polish pass** — a follow-up LLM call (claude-sonnet) applies the brand voice and glossary to the translated text: ensures technical terms use the tenant glossary, restores voice descriptors (tone_descriptors in profile.brand_voice), and adapts cultural references if declared in the locale config.

---

## Inputs

| Field | Type | Description |
|---|---|---|
| artifact_ref | string | ContextBus key of source artifact |
| source_locale | string | e.g., "en-US" |
| target_locales[] | string[] | from profile.languages.supported |
| glossary_ref | string (optional) | `tenants/<id>/baseline/glossary_<locale>.yaml` |

---

## Locale config in tenant profile

```yaml
languages:
  default: en-US
  supported:
    - locale: en-US
      name: "English (US)"
    - locale: en-GB
      name: "English (UK)"
      tone_adaptation: "Replace 'optimize' with 'optimise'; 'license' → 'licence'; British spelling throughout"
    - locale: de-DE
      name: "German"
      glossary: "tenants/<id>/baseline/glossary_de-DE.yaml"
      cultural_notes: "Formal Sie form for B2B; no casual contractions; technical precision valued"
    - locale: fr-FR
      name: "French"
      glossary: "tenants/<id>/baseline/glossary_fr-FR.yaml"
```

---

## Steps

### Per target locale:

1. Load source artifact from ContextBus.
2. Extract translatable prose fields (non-key, non-URL, non-schema string values > 10 chars).
3. Load glossary file if present (`tenants/<id>/baseline/glossary_<locale>.yaml`). Glossary format: `term_en: term_locale` pairs used as DeepL glossary.
4. Call DeepL API: `POST /v2/translate` with `source_lang`, `target_lang`, `glossary_id` (if available), `tag_handling: xml` (to preserve HTML/markdown).
5. Reconstruct artifact with translated prose fields substituted.
6. Tone-polish LLM call (claude-sonnet): "You are localizing marketing copy from {{ source_locale }} to {{ target_locale }}. Apply these brand voice descriptors: {{ profile.brand_voice.tone_descriptors }}. Apply these cultural notes: {{ locale_config.cultural_notes }}. Make the copy feel native, not translated. Do not alter: product names, URLs, JSON keys, schema fields. Return the corrected prose sections only."
7. Merge polish back into artifact.
8. Run brand validator on localized output (same pass threshold as source).
9. Write localized artifact to ContextBus: key = `<original_key>:locale=<target_locale>`.
10. Audit log: `artifact.localized`.

---

## Output (caller perspective)

```
[localization] Localizing phase3.website_copy.output → de-DE
   Source: en-US (WebsiteCopyPack:v1.0.0)
   DeepL: 2,340 chars translated (glossary: 18 terms enforced)
   Tone polish: applied (cultural_notes: formal B2B, Sie form)
   Brand validation: PASSED (tone score 0.81)
   Published: phase3.website_copy.output:locale=de-DE
   [localization] Done. 1 locale in 38s.
```

---

## Glossary file format

```yaml
# tenants/<id>/baseline/glossary_de-DE.yaml
version: 1
locale: de-DE
terms:
  - en: "security posture"
    translated: "Sicherheitslage"
    notes: "preferred over Sicherheitsposition in B2B"
  - en: "threat exposure"
    translated: "Bedrohungsexposition"
```

---

## Do NOT

- Don't translate product names, brand names, or proper nouns — add them to the DeepL glossary with `translate: false`.
- Don't localize JSON schema keys or ContextBus artifact keys.
- Don't bypass the tone-polish pass for "similar" locales (en-US → en-GB still needs spelling/idiom adaptation).
- Don't run localization before the source artifact is CMO-approved — localized variants inherit the approval requirement.
- Don't auto-publish localized artifacts to external channels — they enter the same approval queue as source-locale artifacts.

---

## Workstream status

- **A/B/C:** not available (no DeepL integration wired).
- **D:** active for tenants with `profile.languages.supported` length > 1. DeepL API key configured via `integrations.deepl.api_key_env_var`.

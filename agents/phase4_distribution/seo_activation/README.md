# Agent: phase4.seo_activation

**Phase:** 4 **Stage:** 3 of 6
**Inputs:** campaign_calendar (approved), content_assets, website_copy (optional), keyword_intent, content_pillars (optional)
**Output:** SEOActivationPack (per-asset SEO specs + sitemap + redirects + AI search FAQs)

## Mission

Operationalize SEO for every asset and page in the cycle — URL, title, meta,
H1, internal linking graph, schema markup, sitemap updates, AI Overview FAQ
targeting, redirects.

## Distinctive features

- **Every asset gets a spec.** Orphan = redo.
- **Char limits hard.** Title ≤60, meta ≤160.
- **Bidirectional internal links.** A→B implies B is in A's internal_links_in.
- **AI Overview FAQs 40-60 words.** Strict for citation.
- **Schema type per asset type.** Article / FAQPage / HowTo / Product / BreadcrumbList.

## Outputs

| Field | Consumed by |
|---|---|
| `asset_seo_specs[]` | Dev team (Jira/GitHub MCP — Workstream D) for implementation |
| `ai_search_faqs[]` | Content team for FAQ section refinement; phase5.measurement (AI citation tracking) |
| `redirects[]` | Webops |

## Approval gate

No mandatory CMO gate. SEO Lead sample-reviews.

## KPIs

| KPI | Target |
|---|---|
| Asset coverage | 100% |
| Char limit compliance | 100% |
| Schema JSON-LD coverage | ≥ 80% |
| AI Overview targets | ≥ 3 |
| Avg internal links per asset | ≥ 3 in + 3 out |

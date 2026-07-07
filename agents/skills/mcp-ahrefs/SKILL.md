---
name: mcp-ahrefs
description: Read Ahrefs — keyword volumes, KD, SERP features, backlinks, content gaps, competitor research. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-ahrefs (Workstream C stub)

## Status

**STUB.** Workstream D wires the actual Ahrefs MCP server.

## What agents will call

| Operation | Used by |
|---|---|
| `keyword_metrics(keywords, country)` | phase1.keyword_intent (fills volume + KD) |
| `serp_features(keyword)` | phase4.seo_activation (snippet target identification) |
| `content_gap(domains, our_domain)` | phase1.keyword_intent, phase2.content_pillars |
| `backlink_summary(domain)` | phase1.market_research (competitor authority) |
| `top_pages(domain, country)` | phase1.market_research (which competitor pages drive their traffic) |

## Required tenant config

```yaml
tech_stack:
  seo: ahrefs
integrations:
  ahrefs:
    api_token_env_var: AHREFS_API_TOKEN
    seat_email: "seo@acme.com"
```

## Do NOT

- Don't burn quota on speculative queries — bulk what you need in one call.
- Don't return raw URLs containing tenant secrets (UTM params with internal IDs).

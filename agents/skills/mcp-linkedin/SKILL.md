---
name: mcp-linkedin
description: Read/write LinkedIn — posts, ad campaigns, audiences, Sales Navigator searches. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-linkedin (Workstream C stub)

## Status

**STUB.** Workstream D wires LinkedIn (Ads, Sales Nav, Organic) MCP servers.

## What agents will call

| Operation | Used by |
|---|---|
| `post_to_company_page(content)` | phase3.social_content (after CMO approval) |
| `post_to_user_page(user_handle, content)` | phase3.social_content (executive voice; per-exec approval) |
| `create_ad_campaign(setup)` | phase4.paid_media |
| `read_audience(audience_id)` | phase4.paid_media |
| `sales_nav_search(filters)` | phase4.outbound_partner (account research) |
| `read_post_metrics(post_id)` | phase5.measurement |

## Required tenant config

```yaml
tech_stack:
  social: linkedin
  ad_platforms: [linkedin_ads]
integrations:
  linkedin:
    company_page_id: "..."
    ad_account_id: "..."
    oauth_env_var: LINKEDIN_OAUTH_TOKEN
```

## Do NOT

- Don't post to a user's page without their explicit confirmation per post.
- Don't tag accounts not in `q_tags_mentions_approved`.
- Don't bulk-add Sales Nav leads to outbound lists without dedup against existing CRM contacts.

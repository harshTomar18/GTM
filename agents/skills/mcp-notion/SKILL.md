---
name: mcp-notion
description: Read/write Notion — pages, databases, content briefs, campaign calendars. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-notion (Workstream C stub)

## Status

**STUB.** Workstream D wires the Notion MCP server.

## What agents will call

| Operation | Used by |
|---|---|
| `read_database(database_id, filter)` | phase1.brief_intake (campaign briefs DB), phase3.content_assets (editorial DB) |
| `write_page(parent_id, properties, content)` | phase3.content_assets (publishing drafts), phase4.campaign_calendar (calendar entries) |
| `update_page(page_id, properties, content)` | phase4.campaign_calendar |
| `append_block_children(block_id, children)` | phase5.executive_brief (board doc updates) |

## Required tenant config

```yaml
integrations:
  notion:
    workspace_id: "..."
    integration_token_env_var: NOTION_INTEGRATION_TOKEN
    default_database_ids:
      content_calendar: "..."
      campaign_briefs: "..."
      editorial: "..."
```

## Do NOT

- Don't overwrite pages without preserving prior version (use child blocks + timestamp).
- Don't write secrets / API keys into Notion content.

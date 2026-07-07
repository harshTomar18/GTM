---
name: mcp-drive
description: Read/write Google Drive — docs, sheets, slides, files. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-drive (Workstream C stub)

## Status

**STUB.** Workstream D wires the Google Drive MCP server.

## What agents will call

| Operation | Used by |
|---|---|
| `upload_file(parent_id, name, content, mime_type)` | phase5.executive_brief (PDF export), phase3.sales_enablement (one-pager PDFs) |
| `read_file(file_id)` | phase1.brief_intake (existing brief documents), phase1.audience_intelligence (interview transcripts) |
| `create_doc(title, content)` | phase4.campaign_calendar (calendar export) |
| `share_file(file_id, email, role)` | post-approval distribution |

## Required tenant config

```yaml
integrations:
  drive:
    workspace_domain: "acme.com"
    service_account_env_var: GDRIVE_SERVICE_ACCOUNT_JSON
    folder_ids:
      cycle_outputs: "..."
      sales_enablement: "..."
      executive_briefs: "..."
```

## Do NOT

- Don't share publicly — always restrict to workspace or named users.
- Don't store API keys / secrets in Drive content.

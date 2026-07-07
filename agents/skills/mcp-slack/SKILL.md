---
name: mcp-slack
description: Read/write Slack — channel messages, DMs, notifications, approval requests. STUB in Workstream C; Workstream D wires the actual MCP connection.
---

# Skill: mcp-slack (Workstream C stub)

## Status

**STUB.** Workstream D wires the Slack MCP server.

## What agents will call

| Operation | Used by |
|---|---|
| `post_message(channel, blocks)` | Approval Engine notifications, phase5.competitive_pulse alerts |
| `post_thread_reply(channel, ts, message)` | Approval Engine follow-ups |
| `read_channel_messages(channel, since_ts)` | phase1.audience_intelligence (if internal Slack VOC source approved), phase5.competitive_pulse |
| `post_dm(user_id, blocks)` | Approval Engine personal notifications |

## Required tenant config

```yaml
integrations:
  slack:
    workspace_id: "..."
    bot_token_env_var: SLACK_BOT_TOKEN
    default_channels:
      approvals: "#gtm-approvals"
      alerts: "#gtm-alerts"
      digest: "#gtm-digest"
```

## Do NOT

- Don't post to public channels for approval requests with PII (use DM).
- Don't auto-respond to threads (humans should drive decisions; bot only notifies).

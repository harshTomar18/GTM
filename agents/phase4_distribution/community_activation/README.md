# Agent: phase4.community_activation

**Phase:** 4 **Stage:** 6 of 6 (last Phase 4 agent)
**Inputs:** campaign_calendar (approved), social_content, content_assets (optional), audience_intelligence
**Output:** CommunityActivationPack (programs across owned/earned/adjacent/influencer/employee_advocacy/ama)

## Mission

Activate community programs anchored on real persona watering_holes, with named
communities (not "LinkedIn" generically), specific KPIs, named advocates,
disclosure compliance, and concrete escalation paths.

## Distinctive features

- **Community_id NAMED.** "FinOps Foundation Slack" yes; "Slack" no.
- **KPI target on every program.** Metric + number + window. "Track engagement" = fail.
- **Disclosure compliance enforced.** Every paid creator → disclosure_required: true + mechanism.
- **Owned community honest.** No fabricating an owned community if user said "none."
- **Real advocates only.** No invented employee names or creator partners.

## Outputs

| Field | Consumed by |
|---|---|
| `community_programs[]` | phase3.social_content (loop — community-specific reposts), phase5.measurement (community-attributed pipeline tracking) |
| `employee_advocacy_roster` | Internal comms / GaggleAMP MCP (Workstream D) |

## Approval gate

`brand_impacting` (CMO) + `executive_voice` (CEO if executive-led AMAs).

## KPIs

| KPI | Target |
|---|---|
| Community programs | ≥ 3 |
| Watering hole coverage | ≥ 80% |
| KPI targets present | 100% |
| Disclosure compliance | 100% (when paid) |

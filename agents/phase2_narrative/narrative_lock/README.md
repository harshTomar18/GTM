# Agent: phase2.narrative_lock

**Phase:** 2 **Stage:** 5 of 5 (Phase 2 exit gate)
**Inputs:** positioning, value_proposition, messaging_matrix, content_pillars — ALL must be approved
**Output:** NarrativeLockDoc

## Mission

Synthesize the four approved Phase 2 artifacts into one **frozen** narrative
architecture every Phase 3 + 4 agent reads. Define the 5-act narrative arc, the
must-say phrases, the must-not-say traps, and the conditions under which the
lock can be broken mid-cycle.

## Distinctive features

- **Synthesizes only. Doesn't invent.** This agent doesn't add new positioning,
  value props, or differentiators. It locks what's been approved.
- **5-act narrative arc.** Context → tension → shift → resolution → proof.
  Every downstream artifact tells some part of this story.
- **must_say AND must_not_say.** What downstream copy must include + cycle-specific
  positioning traps to avoid. Both lists matter equally.
- **Reopen conditions are specific events.** Not "if things change" — actual
  named events (competitor acquisition, regulatory ruling, repeat lost deals).

## Distinctive questions

- Lock duration: cycle / quarter / year.
- Reopen conditions: specific events that would justify breaking the lock.
- Executive voice overrides: which executives' personal communications can
  override the lock (CEO blog, CISO thought leadership, etc.).

## Outputs

| Field | Consumed by |
|---|---|
| `NarrativeLockDoc` | EVERY Phase 3 + 4 agent reads this; all artifacts validate against must_say / must_not_say |

## Approval gate

`phase_exit_gate` (CMO + SalesLeader) + `executive_voice` (CEO).
**Blocks Phase 3 — assets cannot be created until locked.**

The CMO + CEO + SalesLeader should:
1. Read the 5-act narrative arc out loud. Does it tell a coherent story?
2. Pressure-test must_not_say: are these the right traps to flag?
3. Confirm reopen_conditions: which named events would justify breaking it?
4. Sign off — and then commit to not asking for revisions to upstream artifacts.

## KPIs

| KPI | Target |
|---|---|
| Stakeholder sign-off | 100% (3 of 3 required roles) |
| must_say phrases | ≥ 5 |
| must_not_say traps | ≥ 3 |
| Mid-cycle reopens | 0 (the goal — track over the cycle) |

## Failure modes

| Mode | Action |
|---|---|
| Any referenced artifact lacks approved_at | redo |
| must_say < 5 OR must_not_say < 3 | redo |
| narrative_arc has empty acts | redo_strict |

## Why this is the highest-leverage gate

After this artifact is approved, 18+ downstream artifacts (Phase 3 + 4) inherit
the narrative. Mid-cycle reopens are very expensive — they retroactively
invalidate already-published work. The 0.80 auto_redo_threshold reflects the
asymmetry: get this right once vs. fix 18 things later.

## Human review checklist

Before approving, each required role asks themselves:

**CMO:** "If I gave this to a brand-new copywriter and they wrote a landing page,
would it land where I want?"

**CEO:** "Can I deliver this narrative arc on a customer call without hedging?"

**SalesLeader:** "Will my reps remember the must_say phrases when they're on a
discovery call under pressure?"

If any answer is "not yet," reject with a specific comment. The narrative tightens
in one redo cycle, not five.

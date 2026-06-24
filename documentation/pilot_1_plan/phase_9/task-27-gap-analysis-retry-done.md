# Task 27 — Gap analysis failure / empty Tier 2 retry UX
## Status: DONE (v1) — 2026-05-21 — verify only; implemented in Phase 10 task-32
## Phase: 9 — Report persistence & resume
## Estimated Time: 1–2 hours
## Depends On: task-23 (checkpoints recommended)

---

## Why This Task Exists

When gap analysis times out or errors, `report/answer` returns `gap_analysis_complete` with **`tier2Questions: []`** and a warning. The client still transitions to an **empty Tier 2 board** with no way to regenerate questions — nurses cannot continue the flow.

---

## What This Task Creates / Modifies

1. `app/api/report/answer/route.ts` — optional new action or dedicated route:
   - **Option A:** `POST /api/report/retry-gap-analysis` with `{ sessionId }`
   - **Option B:** `questionId: "__RETRY_GAP__"` with `tier: "tier1"` when `reportPhase === "tier2"` and board empty
2. `app/staff/report/page.tsx` — empty Tier 2 board UI:
   - Message: “We couldn’t generate follow-up questions. Check connection and try again.”
   - Button: **Retry** → calls retry endpoint; loading state
   - Secondary: **Continue with Tier 1 only** only if product allows skip (otherwise hide)
3. On successful retry: same response shape as `gap_analysis_complete`; persist via checkpoint (task 23)

---

## API behavior (retry)

- Session must be reporter; `reportPhase` tier2 or tier1 complete with empty tier2
- Re-run `analyzeNarrativeAndScore` + `generateGapQuestions` (same as last tier1 answer path)
- On success: update session `tier2Questions`, return board
- On failure: 503 with `{ error, retryable: true }` — do not advance to closing

---

## Success Criteria

- [ ] Simulated gap failure (mock or timeout) shows retry UI, not blank dead-end
- [ ] Successful retry populates Tier 2 board
- [ ] Retry persists questions to Mongo when task 23 is done
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Empty tier2 after error
  Setup: force gap_analysis error path (tier2Questions: [])
  Action: land on tier2_board
  Expected: Retry CTA visible; no silent empty board

TEST 2 — Retry success
  Action: Tap Retry with OpenAI available
  Expected: tier2 questions appear; checkpoint updates Mongo
```

---

## Implementation Prompt

```
Fix empty Tier 2 dead-end after gap analysis failure (Phase 9 task 27).

Add retry endpoint or __RETRY_GAP__ handler reusing gap analysis from report/answer.
Update staff report page tier2_board empty state with Retry button.
Do not mark tier2 complete when zero questions unless nurse explicitly defers or product signs off Tier 1 only (out of scope unless requested).
```

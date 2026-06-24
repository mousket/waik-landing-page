# Task 32 — Gap analysis failure / empty Tier 2 retry UX
## Status: DONE — 2026-05-21
## Phase: 10 — Tier 2 gap analysis quality
## Estimated Time: 1–2 hours
## Depends On: task-29 (recommended: task-31 for shared prepare helper)

---

## Why This Task Exists

When gap analysis times out or errors, `handleTier1Answer` returns `gap_analysis_complete` with `tier2Questions: []` and a warning. The staff UI transitions to an **empty Tier 2 board** with no recovery—nurses cannot continue the report flow.

**Coordination:** Phase 9 [task-27](../phase_9/task-27-gap-analysis-retry.md) describes the same fix with Mongo checkpoint notes. Implement **once**. If task-27 is already renamed to `-done.md`, verify behavior and mark this task **Done (v1)** with a cross-reference only.

---

## What This Task Creates / Modifies

1. **API** — choose one:
   - **Option A:** `POST /api/report/retry-gap-analysis` with `{ sessionId }`
   - **Option B:** `POST /api/report/answer` with `questionId: "__RETRY_GAP__"` and `tier: "tier2"` when session has empty `tier2Questions` and Tier 1 is complete
2. Re-run the same pipeline as last Tier 1 answer: narrative → analyze → normalize (task 31) → `generateGapQuestions`.
3. `app/staff/report/page.tsx` — on `tier2_board` with zero questions:
   - Message: “We couldn’t generate follow-up questions. Check your connection and try again.”
   - **Retry** button → calls retry endpoint; loading state on `gap_analysis` phase
   - Show `warning` from API if present
   - Do **not** offer “skip Tier 2” unless product explicitly requests (out of scope)
4. On failure: return **503** with `{ error, retryable: true }`; do not set `reportPhase` to `closing`.
5. If Phase 9 task-23 is done: persist retried Tier 2 questions via existing checkpoint hook.

---

## Success Criteria

- [ ] Forced gap error path shows Retry CTA, not a blank board.
- [ ] Successful retry returns `gap_analysis_complete` with non-empty `tier2Questions` when OpenAI + missing fields exist.
- [ ] Reporter-only; wrong session returns 403/404.
- [ ] `npm run build` passes.

---

## Test Cases (manual)

```
TEST 1 — Empty tier2 after error
  Setup: simulate timeout (lower GAP_ANALYSIS_TIMEOUT_MS in dev) or break OpenAI temporarily
  Action: complete Tier 1, land on tier2_board
  Expected: Retry visible; explanatory copy

TEST 2 — Retry success
  Action: restore OpenAI, tap Retry
  Expected: follow-up questions appear; phase tier2_board populated

TEST 3 — Duplicate with Phase 9
  If task-27-done.md exists: run TEST 1–2 once; mark task-32 Done (v1) "verified via task-27"
```

---

## Implementation Prompt

```
Phase 10 task 32: Gap analysis retry UX.

Add retry endpoint or __RETRY_GAP__ handler reusing Tier 1 complete gap pipeline
(include task 31 normalization if merged).
Update app/staff/report/page.tsx tier2_board empty state.

If phase_9/task-27-gap-analysis-retry-done.md already exists, verify and document only.

No automated regression tests in this phase.

Mark DONE, rename -done.md, update phase_10/README.md and PILOT_READY task-32 if distinct from task-27.
```

# Phase 11d — Agent Handoff

**Read first:** [`README.md`](./README.md) — scope, decisions, dependency graph.

---

## One-sentence mission

Make Tier 2 follow-up a **stable checklist**: one answer removes one card, dashboard counts match reality, and **Closing** only starts when the follow-up board is empty.

---

## Execute in order

| Step | File | What it builds |
|------|------|----------------|
| 1 | `task-46-stable-tier2-queue-done.md` | ✅ Option A — `tier2-stable-board.ts` |
| 2 | `task-47-tier2-to-closing-transition-done.md` | ✅ tier2 → closing when board empty |
| 3 | `task-48-dashboard-question-breakdown-done.md` | ✅ Dashboard breakdown + deferred fix |
| 4 | `task-49-integration-verification.md` | Manual E2E QA |

---

## Critical constraints

1. **Do not call `generateGapQuestions` inside `handleTier2Answer`.** Gap analysis runs at Tier 1 completion only.

2. **Closing transition rule:** `applyStableTier2Answer().readyForClosing` ⇔ live `tier2Questions.length === 0` after removing the answered card. **Not** completeness threshold.

3. **Deferred is not answered.** `__DEFERRED__` and `__UNKNOWN__` must not reduce dashboard pending counts.

4. **Resume reconstruct:** Live Tier 2 board = unanswered + deferred only; substantively answered cards are not re-shown.

5. **Checkpoint sync** (`persistReportCheckpoint`) must reflect stable board — answered Tier 2 cards live in `tier2Answers` + `dataPointsPerQuestion`, not on the live board.

---

## Key files to read before starting

| File | Why |
|------|-----|
| `lib/report/tier2-stable-board.ts` | Option A core |
| `app/api/report/answer/route.ts` | `handleTier2Answer`, `handleDeferAll` |
| `lib/report/reconstruct-session-from-incident.ts` | Resume phase detection |
| `lib/staff-incident-access.ts` | Dashboard pending breakdown |
| `components/staff/pending-questions-breakdown.tsx` | Dashboard UI |

---

## When you finish a task

1. Set `## Status: DONE` + date at top of the task file.
2. Rename: `task-NN-slug.md` → `task-NN-slug-done.md`.
3. Update this folder's `README.md` checklist.
4. Run `npm run test`.

---

## Do NOT

- Reintroduce full-board replace from `generateGapQuestions` on each Tier 2 answer.
- Use completeness % alone to advance to Closing.
- Treat `__DEFERRED__` as answered in pending counts.
- Remove deferred cards from the live board without an explicit nurse answer.

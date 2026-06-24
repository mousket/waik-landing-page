## Status: DONE — 2026-05-21
# Task 28 — Integration tests + PILOT_READY sign-off
## Phase: 9 — Report persistence & resume
## Estimated Time: 1–2 hours
## Depends On: tasks 22–27

---

## Why This Task Exists

This phase fixes **data loss visibility** on incident detail — a pilot blocker. Automated tests and checklist updates prevent regression when report routes change again.

---

## What This Task Creates / Modifies

1. `__tests__/report-session-sync.test.ts` — if not fully done in task 22, extend coverage
2. `__tests__/report-persistence.integration.test.ts` — optional API-level tests with mocked Mongo/Redis OR document manual matrix
3. [`../PILOT_READY.md`](../PILOT_READY.md) — new **Phase 9** section with checkboxes
4. [`README.md`](./README.md) — phase status **IMPLEMENTED** when all tasks done
5. Update [`../phase_7/README.md`](../phase_7/README.md) — note task-14 “Answer Now” **functional** after Phase 9

---

## Manual QA matrix (required)

| # | Flow | Expected |
|---|------|----------|
| 1 | Start fall report for resident | Detail shows Tier 1 questions (unanswered) after first navigation away |
| 2 | Answer all Tier 1 | Detail shows answers; Tier 2 section appears after gap analysis |
| 3 | Answer some Tier 2, defer rest | Deferred badge; can resume from dashboard |
| 4 | Sign off | Phase 1 complete; clinical record + all Q&A on detail |
| 5 | Admin opens same incident | Same questions visible on admin detail |
| 6 | Gap retry | After forced failure, Retry recovers Tier 2 board |
| 7 | Answer Now | Opens resume, not new report |

---

## Success Criteria

- [ ] `npm run test` passes (new + existing)
- [ ] `npm run typecheck` && `npm run build` pass
- [ ] Manual QA matrix above signed off (Pass/Fail recorded in this file or handoff note)
- [ ] PILOT_READY Phase 9 checkboxes added and ticked after QA
- [ ] All task files renamed to `*-done.md`; README table all **Done**

---

## Test Cases (automated minimum)

```
TEST A — sync helper (task 22)
  Run: npm run test -- __tests__/report-session-sync.test.ts

TEST B — start seeds questions (task 23)
  If integration harness exists: POST start → assert Mongo questions.length >= 5
  Else: document manual TEST 1 in QA matrix as Pass
```

---

## Implementation Prompt

```
Close Phase 9 (task 28): integration verification.

1. Ensure unit tests for sync-session-to-incident cover tier1/tier2/closing/deferred.
2. Add PILOT_READY.md Phase 9 section with checkboxes mirroring manual QA matrix.
3. Run full verification commands; fix any regressions.
4. Rename all phase_9 task files to -done.md and set README status to IMPLEMENTED.
5. Add one paragraph to phase_7 README under task-14 noting Answer Now resume depends on Phase 9 (complete).
```

---

## Phase sign-off

| Item | Pass/Fail | Date | Notes |
|------|-----------|------|-------|
| Automated tests | ___ | ___ | |
| Manual QA 1–7 | ___ | ___ | |
| PILOT_READY updated | ___ | ___ | |
| README IMPLEMENTED | ___ | ___ | |

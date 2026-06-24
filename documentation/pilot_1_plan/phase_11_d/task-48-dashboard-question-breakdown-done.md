## Status: DONE — 2026-06-07
## Phase: 11d — Dashboard question breakdown
## Estimated Time: 3–4 hours
## Depends On: none (can parallel with 46)

---

## Why This Task Exists

Dashboard showed `2 questions left` while the report had 10 Tier 2 follow-ups. Causes:

1. Wrong formula: `tier2QuestionsGenerated - questionsAnswered` (Tier 1 answers inflated `questionsAnswered`)
2. `__DEFERRED__` counted as answered
3. No per-phase breakdown (Tier 1 / Tier 2 / Closing)

---

## What This Task Creates / Modifies

1. **`lib/staff-incident-access.ts`**
   - `isQuestionSubstantivelyAnswered` — excludes deferred/unknown
   - `countReporterPendingBreakdown` — tier1, tier2, closing, tier2Generated

2. **`lib/types/staff-incident-summary.ts`** — `pendingTier1Count`, `pendingTier2Count`, `pendingClosingCount`, `tier2Generated`, `reporterName`

3. **`components/staff/pending-questions-breakdown.tsx`** — total + three phase lines

4. **`components/staff/staff-incident-pill.tsx`** — larger card, reporter, date, ref, breakdown

5. **`components/staff/question-board.tsx`** + **`app/staff/report/page.tsx`** — back link to incident detail on Tier 2 / Closing

6. **Tests:** `pending-question-utils.test.ts`, `staff-incident-access.test.ts`

---

## Success Criteria

- [x] Helen: `13 questions left` — Tier 1 complete · Tier 2 10 · Closing 3
- [x] Dorothy: `11 questions left` — Tier 1 8 · Tier 2 not generated · Closing 3
- [x] Deferred Tier 2 counts as pending
- [x] Tier 2 / Closing boards: back arrow → `/staff/incidents/[id]`

---

## Implementation Prompt

```
Phase 11d task 48: Fix dashboard pending counts and per-phase breakdown.

Use countReporterPendingBreakdown from incident.questions.
Add PendingQuestionsBreakdown to staff incident pill.
Add detailBackHref on Tier 2 and Closing QuestionBoard.

Mark DONE, update phase_11_d/README.md.
```

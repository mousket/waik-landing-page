## Status: DONE — 2026-06-07
## Phase: 11d — Stable Tier 2 queue
## Estimated Time: 2–3 hours
## Depends On: Phase 10 gap analysis (Tier 1 → Tier 2 generation)

---

## Why This Task Exists

After each Tier 2 answer, `handleTier2Answer` called `generateGapQuestions` and `buildNextTier2Board`, **replacing** the live board with a new LLM-generated list. Unmatched cards were dropped. Nurses lost 7 of 10 follow-ups after answering 3.

**Option A:** Tier 2 is a fixed queue from initial gap analysis. Answering removes one card only.

---

## What This Task Creates / Modifies

1. **`lib/report/tier2-stable-board.ts`** (new)
   - `applyStableTier2Answer({ session, answeredQuestionId })`
   - `isSubstantiveTier2AnswerText(text)` — excludes `__DEFERRED__` / `__UNKNOWN__`

2. **`app/api/report/answer/route.ts`**
   - `handleTier2Answer`: remove `generateGapQuestions` / `buildNextTier2Board` / `supplementTier2Questions` from per-answer path
   - Still run `fillGapsWithAnswer` + `normalizeExtractionFromNarrative` for `agentState` / completeness display

3. **`__tests__/tier2-stable-board.test.ts`**

---

## Success Criteria

- [x] Answer `t2-q3` on a 10-card board → 9 cards remain, same IDs except removed
- [x] Answer last card → `readyForClosing: true`
- [x] Deferred cards stay on board when other cards are answered
- [x] `npm run test` passes

---

## Implementation Prompt

```
Phase 11d task 46: Implement stable Tier 2 queue (Option A).

Add lib/report/tier2-stable-board.ts with applyStableTier2Answer.
Refactor handleTier2Answer to use it instead of regenerating the board.

Keep gap analysis on Tier 1 completion only (runTier1GapAnalysis unchanged).

Add unit tests. Mark DONE, update phase_11_d/README.md.
```

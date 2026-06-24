## Status: DONE — 2026-06-07
## Phase: 11d — Tier 2 → Closing transition
## Estimated Time: 2 hours
## Depends On: task-46

---

## Why This Task Exists

Previously, `completenessPercent >= 75` advanced to Closing even with open Tier 2 cards. Nurses at 90% completeness saw Closing after 3 answers while 7 follow-ups remained.

---

## What This Task Creates / Modifies

1. **`app/api/report/answer/route.ts`**
   - `readyForClosing` from `applyStableTier2Answer` (board empty)
   - `reportPhase = "closing"` only when `readyForClosing`
   - Response `status: "closing_ready"` with `CLOSING_QUESTIONS`
   - Mongo `activeReportPhase: "closing" | "tier2"`

2. **`lib/report/reconstruct-session-from-incident.ts`**
   - Live Tier 2 board excludes substantively answered questions
   - `reportPhase = "closing"` when Tier 2 was generated and live board is empty
   - `reportPhase = "tier2"` while follow-ups or deferred cards remain

---

## Success Criteria

- [x] 3 of 10 answered → stay on Tier 2 (not Closing)
- [x] 10 of 10 answered → `closing_ready`
- [x] 7 deferred on board → not Closing until those are answered or removed
- [x] Resume from Mongo restores correct `reportPhase`

---

## Implementation Prompt

```
Phase 11d task 47: Tier 2 → Closing only when live follow-up board is empty.

Remove completeness-threshold gate from handleTier2Answer transition.
Update reconstruct-session-from-incident for stable board + phase detection.

Mark DONE, update phase_11_d/README.md.
```

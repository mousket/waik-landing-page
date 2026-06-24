## Status: DONE — 2026-05-21
# Task 24 — Full question flush on report/complete
## Phase: 9 — Report persistence & resume
## Estimated Time: 1–2 hours
## Depends On: task-22, task-23

---

## Why This Task Exists

`POST /api/report/complete` updates `initialReport`, phase, and analytics but **does not** write `questions[]`. After sign-off, staff detail **Questions** tab and “All your answers” can still be empty. Sign-off must be the **authoritative** final snapshot before Redis session delete.

---

## What This Task Modifies

- `app/api/report/complete/route.ts` — include full `questions` sync in `$set` before `deleteReportSession`

---

## Behavior

1. After clinical record + verification, before `deleteReportSession`:
   - `buildQuestionsFromReportSession(session)` — final board including Tier 1, Tier 2, closing, deferred markers
   - `$set.questions` to that array (replace entire array, not `$push` fragments)
2. Ensure `initialReport.narrative` / `enhancedNarrative` remain as today; questions must align with narrative content
3. Clear `activeReportSessionId` on incident if field added in task 25 (no-op if field not yet present)

---

## Success Criteria

- [ ] After sign-off, `GET /api/incidents/[id]` returns all answered questions with text
- [ ] Admin incident detail Questions tab shows same data
- [ ] `questionsAnswered` / `tier2QuestionsGenerated` consistent with question array
- [ ] Redis session still deleted on success
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Complete with full session
  Setup: session with tier1 + tier2 + closing all answered
  Action: POST /api/report/complete with valid signature
  Action: GET incident
  Expected: phase phase_1_complete; questions.length > 0; each answered tier has answer object
  Expected: Redis key waik:report:{sessionId} absent

TEST 2 — Complete after checkpoints
  Setup: nurse answered via report/answer only (checkpoints ran)
  Action: sign off
  Expected: questions array matches session (no regression vs last checkpoint)
```

---

## Implementation Prompt

```
Update app/api/report/complete/route.ts (Phase 9 task 24).

Before deleteReportSession, $set incident.questions from buildQuestionsFromReportSession(session).
Merge into existing setDoc; replace questions array wholesale.
Verify admin and staff GET /api/incidents/[id] show Q&A after sign-off.
```

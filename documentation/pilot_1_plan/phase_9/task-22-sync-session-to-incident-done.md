## Status: DONE — 2026-05-21
# Task 22 — Sync helper: ReportSession → incident.questions[]
## Phase: 9 — Report persistence & resume
## Estimated Time: 2–3 hours
## Depends On: Phase IR-1 (report routes + `ReportSession` type)

---

## Why This Task Exists

Staff and admin UIs read **`incident.questions[]`** from MongoDB. The report flow stores Q&A in **Redis only**. This task adds a single, testable mapper used by checkpoint (task 23), complete flush (task 24), and resume reconstruction (task 25).

---

## What This Task Creates

1. `lib/report/sync-session-to-incident.ts` — build question documents + draft fields from `ReportSession`
2. `__tests__/report-session-sync.test.ts` — unit tests for mapping (tier1 answered, tier2 board, closing, deferred)

---

## Context Files

- `lib/config/report-session.ts` — `ReportSession` shape
- `lib/config/tier1-questions.ts` — Tier 1 + closing question text
- `lib/staff-incident-question-group.ts` — how UI buckets tier1 / tier2 / closing
- `lib/db.ts` — `serializeQuestion` shape (mirror embedded question schema)
- `backend/src/models/incident.model.ts` — embedded `questions` subdocuments

---

## Mapping rules (required)

### Question documents

For each Tier 1 config question, Tier 2 `PendingQuestion`, and closing config question:

| Field | Rule |
|-------|------|
| `id` | Stable: `t1-q*`, `t2-q*`, closing IDs from session/config |
| `incidentId` | `session.incidentId` |
| `questionText` | Tier1/Closing: `text`; Tier2: `text` |
| `askedBy` / `askedByName` | `session.userId` / `session.userName` |
| `askedAt` | Tier2: `PendingQuestion.askedAt`; else session `startedAt` or now ISO |
| `source` | `"voice-report"` |
| `generatedBy` | Tier1: `"tier-1-report"`; Tier2: `"tier-2-gap"`; Closing: `"closing-report"` |
| `priority.phase` | Tier1: omit or `"initial"`; Tier2: `"follow-up"`; Closing: `"final-critical"` |
| `metadata` | `{ reporterId, reporterName, reporterRole, createdVia: "system" }` — no `idt` |
| `answer` | If answer text non-empty: `{ id, questionId, answerText, answeredBy, answeredAt, method: "voice" }` |
| Deferred Tier 2 | `answerText: "__DEFERRED__"` when `questionId` ∈ `tier2DeferredIds` |

### Draft incident fields (returned alongside questions for callers to `$set`)

- `initialReport.narrative` ← `session.fullNarrative` (trimmed)
- `completenessScore` ← `session.completenessScore`
- `tier2QuestionsGenerated` ← `session.tier2QuestionsGenerated ?? tier2Questions.length`
- `questionsAnswered` / `questionsDeferred` / `questionsMarkedUnknown` — counts from session maps (same logic as `report/complete`)

Export:

```typescript
export function buildQuestionsFromReportSession(session: ReportSession): QuestionDoc[]
export function buildIncidentDraftFromSession(session: ReportSession): IncidentDraftPatch
```

Use types compatible with Mongoose update payloads (plain objects, `Date` where model expects Date).

---

## Success Criteria

- [ ] `npm run test` passes for `__tests__/report-session-sync.test.ts`
- [ ] Tier 1 questions with answers round-trip; unanswered have no `answer`
- [ ] Tier 2 questions use `generatedBy` containing `tier-2` so `staffQuestionGroup()` returns `"tier2"`
- [ ] Closing questions bucket as `"closing"` via `priority.phase` or `generatedBy`
- [ ] Deferred answers use `__DEFERRED__`
- [ ] No duplicate question `id`s in output for a given session state
- [ ] `npm run typecheck` passes

---

## Test Cases

```
TEST 1 — Tier 1 only
  Given: session with 5 tier1 questions, 3 answers in tier1Answers
  Expected: 5 question docs; 3 with answer; staffQuestionGroup === tier1 for all

TEST 2 — Tier 2 board
  Given: tier2Questions length 4, 2 answers, 1 deferred id
  Expected: 4 docs; 2 answered; 1 __DEFERRED__; 1 unanswered

TEST 3 — Closing
  Given: 3 closing questions, all answered
  Expected: 3 docs; staffQuestionGroup === closing for all
```

---

## Implementation Prompt

```
Implement lib/report/sync-session-to-incident.ts per Phase 9 task 22.

- Map ReportSession to embedded incident question documents matching lib/db serializeQuestion expectations.
- Use stable question IDs from session; never allocate new random ids on sync.
- Set generatedBy / priority.phase so lib/staff-incident-question-group.ts buckets correctly.
- Add __tests__/report-session-sync.test.ts with the three tests above.
- Do not wire API routes yet (tasks 23–24).
```

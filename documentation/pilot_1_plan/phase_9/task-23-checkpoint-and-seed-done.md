## Status: DONE — 2026-05-21
# Task 23 — Checkpoints in report/answer + seed Tier 1 on report/start
## Phase: 9 — Report persistence & resume
## Estimated Time: 3–4 hours
## Depends On: task-22

---

## Why This Task Exists

The blueprint requires **periodic Mongo checkpoints** during reporting. Without them, leaving the report flow or opening incident detail shows **empty** questions and narratives even after the nurse answered Tier 1 on the voice board.

---

## What This Task Modifies

1. `app/api/report/start/route.ts` — after `IncidentModel.create`, seed Tier 1 questions (unanswered) into `questions[]`
2. `app/api/report/answer/route.ts` — after each successful handler branch, call sync helper and `IncidentModel.updateOne`
3. Optional: `lib/report/checkpoint-incident.ts` — thin wrapper: `persistReportCheckpoint(session)`

---

## Checkpoint behavior

### On `POST /api/report/start`

- After creating incident, `$set`:
  - `questions`: output of `buildQuestionsFromReportSession` for **tier1 only** (empty answers)
  - Or call helper with session-shaped object built from returned tier1 list
- Keeps `questions: []` **out** of create payload — replace with seeded array in same request or immediate update

### On `POST /api/report/answer` (all branches)

After Redis `updateReportSession` succeeds:

1. Load latest session (or use returned updated session).
2. Build `questions` + draft patch via task-22 helper.
3. `IncidentModel.updateOne({ id, facilityId }, { $set: { questions, ...draft, updatedAt } })`.
4. **Do not block** response on failure — `console.error` + continue (nurse UX first); optional retry once.

Trigger on:

- `tier1_updated`
- `gap_analysis_complete` (includes full tier2 board)
- `tier2_updated` / `closing_ready` / `closing_updated`
- `deferred` (defer all)

Also update fields already partially synced (completeness, defer timestamps) — merge into one `$set`.

### Checkpoint frequency (v1)

- **Every answer** is acceptable for pilot (simplest).  
- Optional optimization: every 3rd answer or 60s — only if tested; default **every answer**.

---

## Success Criteria

- [ ] New incident from `report/start` has **5+ Tier 1 questions** in Mongo immediately
- [ ] After one Tier 1 answer, `GET /api/incidents/[id]` shows that question with `answer.answerText`
- [ ] After gap analysis, Tier 2 questions appear on incident document
- [ ] `buildIncidentCombinedNarrative(incident)` non-empty when answers exist
- [ ] Staff incident detail Questions tab lists Tier 1 section after first answer
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Start seeds Tier 1
  Action: POST /api/report/start (fall + resident)
  Action: GET /api/incidents/{incidentId} as reporter
  Expected: questions.length >= 5; all tier1 bucket; none answered

TEST 2 — Tier 1 answer checkpoint
  Action: POST /api/report/answer tier1 for t1-q1
  Action: GET incident
  Expected: t1-q1 has answer; others unanswered

TEST 3 — Gap analysis checkpoint
  Action: Complete all tier1 answers
  Action: GET incident
  Expected: tier2 questions present (if gap analysis succeeded); completenessScore updated
```

---

## Implementation Prompt

```
Wire MongoDB checkpoints for the staff report flow (Phase 9 task 23).

Use lib/report/sync-session-to-incident.ts from task 22.

1. report/start: seed unanswered Tier 1 questions on the new incident (not questions: []).
2. report/answer: after each successful branch, persist full questions array + draft initialReport.narrative + score fields.
3. Keep existing Redis session logic unchanged.
4. Log and swallow Mongo errors without failing the HTTP response to the nurse.
```

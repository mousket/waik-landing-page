## Status: DONE — 2026-05-21
# Task 25 — activeReportSessionId + GET /api/report/resume
## Phase: 9 — Report persistence & resume
## Estimated Time: 2–3 hours
## Depends On: task-22, task-23

---

## Why This Task Exists

`sessionId` exists only in browser memory on `/staff/report`. Redis TTL is **2 hours**. Nurses need a server-side way to **continue** an in-progress incident after navigating away or reopening the app.

---

## What This Task Creates / Modifies

1. `backend/src/models/incident.model.ts` — optional fields:
   - `activeReportSessionId?: string`
   - `activeReportPhase?: string` (mirror `reportPhase`)
2. `app/api/report/start/route.ts` — `$set activeReportSessionId` on incident at start
3. `app/api/report/answer/route.ts` — update `activeReportPhase` on checkpoint
4. `app/api/report/complete/route.ts` — `$unset` active session fields on success
5. `app/api/report/resume/route.ts` — **GET** `?incidentId=`

---

## GET /api/report/resume

### Auth

- Reporter only (`session.userId === incident.staffId` with `sameIdsForOrMatch`)
- Phase must be `phase_1_in_progress`

### Response branches

**A — Active Redis session** (`getReportSession(activeReportSessionId)` hit):

```typescript
{
  status: "session_active",
  sessionId: string,
  incidentId: string,
  reportPhase: ReportPhase,
  tier1Questions: BoardQuestion[],
  tier2Questions: BoardQuestion[],
  closingQuestions: BoardQuestion[],
  answeredIds: string[],
  answers: Record<string, string>,
  completenessScore: number,
}
```

Map from `ReportSession` (same shape as `report/start` + client board types).

**B — Session expired, Mongo has questions** (reconstruct):

```typescript
{
  status: "reconstructed_from_incident",
  sessionId: null,  // client must call new endpoint OR create new session — see note below
  incidentId: string,
  reportPhase: inferred from unanswered tiers,
  tier1Questions: ...,
  // answers prefilled from incident.questions[].answer
  warning?: "Session expired; progress restored from saved report."
}
```

**v1 reconstruction strategy (pick one, document in route):**

- **Preferred:** Create a **new** Redis session from Mongo + tier1 config + unanswered tier2/closing; set `activeReportSessionId` to new id; return `session_active`.
- **Fallback:** Return `reconstructed_from_incident` and extend report page to work read-only from Mongo without session (heavier — avoid unless necessary).

**C — Cannot resume**

- `404` incident not found / not reporter
- `400` phase not in progress
- `409` no session and empty questions (corrupt state)

---

## Success Criteria

- [ ] `report/start` stores `activeReportSessionId` on incident
- [ ] `report/complete` clears it
- [ ] GET resume returns board state for in-progress incident within TTL
- [ ] After TTL, resume still works via reconstruction path
- [ ] Non-reporter gets 403
- [ ] `npm run build` passes

---

## Test Cases

```
TEST 1 — Resume active session
  Setup: start report, answer one tier1
  Action: GET /api/report/resume?incidentId=...
  Expected: session_active; same sessionId; answeredIds includes t1-q*

TEST 2 — Reporter only
  Action: Another staff user GET resume
  Expected: 403

TEST 3 — Complete clears session pointer
  Setup: signed-off incident
  Action: GET resume
  Expected: 400 phase not in progress
```

---

## Implementation Prompt

```
Implement report resume (Phase 9 task 25).

Add activeReportSessionId (+ optional activeReportPhase) to incident model.
Set on report/start; update on checkpoint; unset on report/complete.
Create GET app/api/report/resume/route.ts with session_active and reconstruction paths.
Prefer creating a new Redis session from Mongo when old session expired.
Use lib/report/sync-session-to-incident.ts inverse or dedicated rebuild helper.
```

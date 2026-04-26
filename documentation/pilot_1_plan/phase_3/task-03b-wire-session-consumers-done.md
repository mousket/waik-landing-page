# Task 03b — Wire All Session Consumers to Redis
## Phase: 2 — Core Hardening
## Estimated Time: 2–3 hours
## Depends On: task-03a (Redis session store must be working)

---

## Why This Task Exists

Task-03a replaced the in-memory Map with Redis and proved the store works
in isolation. This task proves the store works end-to-end across the actual
API routes that use it.

The three interview routes form a stateful sequence:
  /api/agent/interview/start  → createSession()
  /api/agent/interview/answer → getSession() + updateSession()
  /api/agent/interview/complete → getSession() + deleteSession()

Plus report-conversational which also reads session state during LLM calls.
And investigate which may maintain its own session context.

All of these previously assumed the Map was in scope. Now that the Map is
gone and all session functions are async, every caller must await them.
This task audits every consumer, fixes any missed await, and proves the
full start → answer → complete flow works across simulated separate
process invocations.

---

## Context Files

- `lib/agents/expert_investigator/session_store.ts` — done in task-03a
- `app/api/agent/interview/start/route.ts` — primary consumer
- `app/api/agent/interview/answer/route.ts` — primary consumer
- `app/api/agent/interview/complete/route.ts` — primary consumer
- `app/api/agent/report-conversational/route.ts` — secondary consumer
- `app/api/agent/investigate/route.ts` — check for session usage
- `app/api/agent/report/route.ts` — check for session usage

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] All `createSession`, `getSession`, `updateSession`, `deleteSession` calls are awaited
- [ ] `POST /api/agent/interview/start` creates a Redis session and returns sessionId
- [ ] `POST /api/agent/interview/answer` reads the Redis session correctly with the sessionId from start
- [ ] `POST /api/agent/interview/complete` reads and then deletes the Redis session
- [ ] Full flow: start → answer → answer → complete runs without session errors
- [ ] Session state is correct at each step (answers accumulate correctly)
- [ ] `POST /api/agent/report-conversational` reads session without error
- [ ] No TypeScript errors from missing await on async session functions
- [ ] 401 returned for unauthenticated requests (auth still enforced)

---

## Test Cases

```
TEST 1 — Start creates session in Redis
  Action: POST /api/agent/interview/start
          body: { incidentId: "inc-003", facilityId: "fac-sunrise-mpls-001" }
          with valid Clerk session token
  Expected: HTTP 200, response contains { sessionId: "some-uuid" }
            Redis CLI: EXISTS waik:session:{sessionId} → 1
  Pass/Fail: ___

TEST 2 — Answer reads correct session
  Action: Use sessionId from TEST 1
          POST /api/agent/interview/answer
          body: { sessionId, questionId: "q1", answer: "Found resident on floor" }
  Expected: HTTP 200, response contains next question or status
            Redis CLI: GET waik:session:{sessionId} contains the answer
  Pass/Fail: ___

TEST 3 — Session survives between start and answer calls
  Action: POST /start → get sessionId
          Wait 10 seconds (simulates separate serverless invocation)
          POST /answer with same sessionId
  Expected: Answer call succeeds — session data intact from start call
  Pass/Fail: ___

TEST 4 — Multiple answers accumulate correctly
  Action: POST /start → sessionId
          POST /answer (answer 1) → session updated
          POST /answer (answer 2) → session updated again
          Redis CLI: GET waik:session:{sessionId}
  Expected: Session contains both answers in correct order
  Pass/Fail: ___

TEST 5 — Complete cleans up session
  Action: Full flow: start → answer → complete
          After complete: Redis CLI: EXISTS waik:session:{sessionId}
  Expected: 0 (key deleted)
  Pass/Fail: ___

TEST 6 — Answer with invalid sessionId returns error
  Action: POST /api/agent/interview/answer
          body: { sessionId: "nonexistent-session", questionId: "q1", answer: "test" }
  Expected: HTTP 400 or 404 with descriptive error message
            Not a 500 crash
  Pass/Fail: ___

TEST 7 — report-conversational does not crash with Redis
  Action: POST /api/agent/report-conversational with valid session
  Expected: Request processed normally, no Redis-related errors in logs
  Pass/Fail: ___

TEST 8 — Unauthenticated request blocked
  Action: POST /api/agent/interview/start without Clerk session token
  Expected: HTTP 401
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I've replaced the in-memory session store with Redis in task-03a.
Now I need to audit every route that uses the session store and ensure
all calls are correctly awaited and handle errors gracefully.

STEP 1 — AUDIT ALL SESSION CONSUMERS

Search for imports of session_store across the codebase:
  grep -r "session_store\|createSession\|getSession\|updateSession\|deleteSession" \
    --include="*.ts" --include="*.tsx" -l

For each file found:
  - Verify every call to createSession/getSession/updateSession/deleteSession is awaited
  - If any call is missing await: add it
  - If the function containing the call is not async: make it async

STEP 2 — UPDATE app/api/agent/interview/start/route.ts

After getting/creating the session, the response must include the sessionId.
The sessionId is what the client passes to subsequent answer calls.

Pattern:
  export const POST = withAuth(async (req, { currentUser }) => {
    const body = await req.json()
    const { incidentId } = body
    
    const sessionId = crypto.randomUUID()
    
    await createSession(sessionId, {
      incidentId,
      facilityId: currentUser.facilityId,
      userId: currentUser.userId,
      phase: "tier1",
      answers: [],
      startedAt: new Date().toISOString(),
    })
    
    // Generate first question using existing agent logic
    const firstQuestion = await generateFirstQuestion(incidentId)
    
    return Response.json({
      sessionId,
      question: firstQuestion,
      phase: "tier1",
    })
  })

If the existing start route has different logic: preserve it, just ensure
the session is written with createSession (awaited) and sessionId is returned.

STEP 3 — UPDATE app/api/agent/interview/answer/route.ts

Pattern:
  const { sessionId, questionId, answer } = await req.json()
  
  const session = await getSession(sessionId)
  if (!session) {
    return Response.json(
      { error: "Session not found or expired. Please start a new report." },
      { status: 404 }
    )
  }
  
  // Process answer with existing agent logic
  const result = await processAnswer(session, questionId, answer)
  
  // Update session with new answer added
  await updateSession(sessionId, {
    answers: [...session.answers, { questionId, answer, timestamp: new Date().toISOString() }],
    lastUpdatedAt: new Date().toISOString(),
  })
  
  return Response.json(result)

STEP 4 — UPDATE app/api/agent/interview/complete/route.ts

Pattern:
  const { sessionId } = await req.json()
  
  const session = await getSession(sessionId)
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 })
  }
  
  // Generate final report using existing agent logic
  const report = await generateFinalReport(session)
  
  // Clean up session from Redis
  await deleteSession(sessionId)
  
  return Response.json({ report, completedAt: new Date().toISOString() })

STEP 5 — CHECK app/api/agent/report-conversational/route.ts

Open this file. If it reads from the session store:
  - Ensure all reads are awaited
  - Ensure it handles getSession returning null gracefully

If it does not use the session store directly:
  - No changes needed
  - Note this in task-03b-DONE.md

STEP 6 — CHECK app/api/agent/investigate/route.ts and report/route.ts

Same audit: look for session_store imports, ensure awaits, handle null.

STEP 7 — INTEGRATION SMOKE TEST

After all changes: manually test the full flow in the browser or with curl:
  curl -X POST http://localhost:3000/api/agent/interview/start \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer {clerk-token}" \
    -d '{"incidentId":"inc-003"}'
  → capture sessionId from response
  
  curl -X POST http://localhost:3000/api/agent/interview/answer \
    -H "Content-Type: application/json" \
    -d '{"sessionId":"{id}","questionId":"q1","answer":"Found resident on the floor near her bed"}'
  → verify response contains next question

Run npm run build. Fix all TypeScript errors before marking done.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — session consumer audit
- Create `plan/pilot_1/phase_2/task-03b-DONE.md`

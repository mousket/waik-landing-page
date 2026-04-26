# Task 03c — Report-Conversational Timeout + maxDuration
## Phase: 2 — Core Hardening
## Estimated Time: 1–2 hours
## Depends On: task-03b (session consumers wired)

---

## Why This Task Exists

`app/api/agent/report-conversational/route.ts` chains multiple LLM calls
in sequence. On Vercel, serverless functions time out at 60 seconds by
default on Pro plans and 10 seconds on Hobby. A chain of 3+ LLM calls
at typical OpenAI latency (3–8 seconds each) can easily hit 30–45 seconds.
Without `maxDuration`, the function is silently killed mid-chain and the
client gets a 504 with no recovery path.

This task adds `export const maxDuration = 60` to the route and wraps the
LLM chain in a 45-second `Promise.race()` timeout. If the timeout fires,
the partial state is saved to the incident record and a structured
`{ status: "partial" }` response is returned instead of a 504.

The partial response shape the client already handles — this task makes
the server produce it correctly under real timeout conditions.

---

## Context Files

- `app/api/agent/report-conversational/route.ts` — primary target
- `lib/agents/expert_investigator/session_store.ts` — for saving partial state
- `lib/db.ts` — for saving partial incident state on timeout

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] `export const maxDuration = 60` present in report-conversational route
- [ ] LLM chain wrapped in `Promise.race()` with 45-second timeout
- [ ] On timeout: partial response returned with HTTP 200 (not 504)
- [ ] Partial response shape: `{ status: "partial", sessionId, incidentId, message: string }`
- [ ] On timeout: whatever partial session state exists is preserved in Redis
- [ ] On timeout: incident record updated with current completeness score
- [ ] Normal (non-timeout) flow unchanged — still returns full response
- [ ] No 504 errors in Vercel logs when LLM is slow

---

## Test Cases

```
TEST 1 — maxDuration export present
  Action: Open app/api/agent/report-conversational/route.ts
  Expected: Line "export const maxDuration = 60" present at top of file
  Pass/Fail: ___

TEST 2 — Normal flow still works
  Action: POST /api/agent/report-conversational with valid session
          LLM responds within 10 seconds (normal case)
  Expected: Full response returned, status: "complete" or similar
            No partial response
  Pass/Fail: ___

TEST 3 — Timeout returns partial not 504
  Action: Mock all LLM calls to take 46 seconds
          POST /api/agent/report-conversational
  Expected: HTTP 200 returned (not 504)
            Response body: { status: "partial", sessionId, incidentId, message: "..." }
  Pass/Fail: ___

TEST 4 — Partial response has correct shape
  Action: Trigger timeout condition
  Expected: Response contains:
            status: "partial"
            sessionId: (the session that was in progress)
            incidentId: (the incident being processed)
            message: human-readable string about what happened
  Pass/Fail: ___

TEST 5 — Session preserved on timeout
  Action: After a timeout, check Redis for the session
  Expected: Session still exists in Redis with whatever state was
            accumulated before timeout
  Pass/Fail: ___

TEST 6 — Incident record updated on timeout
  Action: After a timeout, fetch the incident from MongoDB
  Expected: completenessScore updated to whatever was computed before timeout
            phase not changed to a wrong value
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I need to add a 60-second maxDuration and a 45-second internal timeout
to app/api/agent/report-conversational/route.ts to prevent Vercel 504s
when the LLM chain is slow.

STEP 1 — Add maxDuration at the top of the route file:

// Must be the first named export in the file
export const maxDuration = 60

This tells Vercel to allow up to 60 seconds for this specific function
(requires Vercel Pro — on Hobby it is capped at 10s regardless).

STEP 2 — Wrap the LLM chain in Promise.race():

Create a helper at the top of the file:
  function createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}`)), ms)
    )
  }

Find the main LLM processing block in the route handler.
Wrap it with Promise.race():

  const INTERNAL_TIMEOUT_MS = 45_000  // 45 seconds

  let result: FullResponseType
  
  try {
    result = await Promise.race([
      runLLMChain(session, incident),   // existing LLM logic
      createTimeout(INTERNAL_TIMEOUT_MS)
    ])
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.startsWith("TIMEOUT_")
    
    if (isTimeout) {
      // Save whatever partial state we have
      // The session in Redis already has the accumulated answers
      // Update the incident with current completeness if available
      
      // Try to save partial state to incident record (best effort)
      try {
        await updateIncidentCompleteness(session.incidentId, session.currentCompleteness ?? 0)
      } catch (saveErr) {
        console.error("[Timeout] Could not save partial state:", saveErr)
      }
      
      return Response.json({
        status: "partial",
        sessionId: session.sessionId,
        incidentId: session.incidentId,
        questions: [],
        message: "Analysis is taking longer than expected. Your progress has been saved. WAiK will continue processing — please check back in a moment.",
      }, { status: 200 })
    }
    
    // Not a timeout — rethrow for standard error handling
    throw err
  }
  
  return Response.json(result)

STEP 3 — Verify the existing LLM chain function signature:

Look at the existing code to find what the main processing function is called.
It might be:
  - A direct set of await calls in the handler
  - A function like runInvestigation(), processReport(), etc.

If it is a series of awaits directly in the handler:
  Extract them into a single async function:
    async function runLLMChain(session: InvestigatorSession, incident: any) {
      // move existing await calls here
      // return the final result
    }
  Then use Promise.race([runLLMChain(...), createTimeout(45_000)])

STEP 4 — Identify updateIncidentCompleteness:

Either:
  a) It already exists in lib/db.ts — use it
  b) It does not exist — add a minimal version:
     async function updateIncidentCompleteness(incidentId: string, score: number) {
       await IncidentModel.updateOne(
         { id: incidentId },
         { $set: { completenessScore: score, updatedAt: new Date() } }
       )
     }

Run npm run build. Fix all TypeScript errors.
Do not change any other routes.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — timeout handling
- Create `plan/pilot_1/phase_2/task-03c-DONE.md`

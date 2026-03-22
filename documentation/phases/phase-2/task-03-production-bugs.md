# Task: Fix Critical Production Bugs
## Phase: 2
## Depends On: task-02-multi-tenant-isolation
## Estimated Time: 4 hours

## Context Files
- lib/agents/expert_investigator/session_store.ts (replace Map with Redis)
- app/api/agent/report-conversational/route.ts (timeout, maxDuration)
- app/staff/report/page.tsx (wake lock, voice fallback, ErrorBoundary)

## Success Criteria
- [ ] Session store uses Redis; key pattern "waik:session:{sessionId}", 2hr TTL
- [ ] report-conversational has maxDuration=60 and 45s timeout; returns "partial" on timeout
- [ ] Staff report page: wake lock when listening; visibility listener restarts listening; textarea fallback after 2 failed voice attempts
- [ ] ErrorBoundary wraps main Card; shows recovery message and "Tap here to restart"

## Test Cases
- Create session, call /answer after delay → session still available (Redis)
- Trigger timeout on report-conversational → response status "partial", client handles gracefully
- Staff report: lock screen then return → listening restarts or textarea shown
- Simulate agent throw → ErrorBoundary catches, user sees recovery message

## Implementation Prompt

```
I'm building WAiK on Next.js 14 deployed on Vercel. I have three critical production bugs to fix before the pilot.

BUG 1 — In-Memory Session Store (CRITICAL):
lib/agents/expert_investigator/session_store.ts uses a JavaScript Map. On Vercel serverless, every request can be a fresh process so sessions are lost between the /start and /answer API calls. This breaks the entire conversational investigation.

FIX: Replace the in-memory Map with Redis using ioredis.
- Key pattern: "waik:session:{sessionId}" with 2-hour TTL
- Store InvestigatorSession as JSON
- Keep exact same API: createSession, getSession, updateSession, deleteSession
- REDIS_URL comes from environment variables
- Handle Redis connection errors gracefully — if Redis is down, return a meaningful error to the client rather than crashing

BUG 2 — Vercel Serverless Timeout:
The /api/agent/report-conversational route chains multiple LLM calls (analyze → gap questions → upsert). This can exceed Vercel's 60-second limit.

FIX:
- Add export const maxDuration = 60 to the route handler
- Add a 45-second timeout wrapper around the full LLM chain
- If timeout is hit, save whatever state was computed and return:
  { status: "partial", sessionId, incidentId, questions: [], message: "Analysis is taking longer than expected. Your report was saved. We'll send you questions shortly." }
- The client should handle "partial" status gracefully

BUG 3 — iOS Voice Interruption:
Web Speech API stops when the iOS screen dims or the user switches apps.

FIX in app/staff/report/page.tsx:
- Request navigator.wakeLock.request('screen') when isListening becomes true
- Release wake lock when isListening becomes false or page loses focus
- Add a visibility change listener: if document.visibilityState === 'visible' and awaitingAnswer is true, restart listening after 1 second
- After 2 consecutive failed voice attempts (no-speech error), automatically show a textarea fallback below the mic button with placeholder "Type your answer here..."
- The textarea fallback submits on Enter key or a "Submit" button
- Keep the mic button visible so user can still try voice

BUG 4 — Missing Error Boundaries:
The staff report page has no error boundary. If the agent throws, the entire page breaks with no recovery.

FIX:
- Wrap the main Card content in an ErrorBoundary component
- On error, show: "Something went wrong. Your progress has been saved. Tap here to restart."
- Log errors to console with enough context to debug
```

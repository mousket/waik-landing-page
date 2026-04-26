# Task 03f — Verification, Docs, and Task-03 Rollup
## Phase: 2 — Core Hardening
## Estimated Time: 1 hour
## Depends On: task-03a through task-03e (all must be complete and passing)

---

## Why This Task Exists

Five infrastructure and component tasks have been completed. This task
is the integration gate — it verifies that all five work together as a
system, not just in isolation. It also produces the documentation and
DONE files that mark phase 2 core hardening as complete.

This is not a code task. It is a verification and documentation task.
Do not ask Cursor to write new code here. Run the checks manually or
with existing test scripts.

---

## Integration Checklist

All items below must be verified before marking task-03f done.

### Redis (task-03a)
- [ ] `redis.ts` singleton connects without error on app startup
- [ ] `TTL waik:session:*` in Redis CLI shows ~7200 for any active session
- [ ] No in-memory Map references remain anywhere in session-related code
- [ ] REDIS_URL is in .env.local and .env.example (no real credentials in .env.example)

### Session Consumers (task-03b)
- [ ] POST /api/agent/interview/start returns { sessionId, question }
- [ ] POST /api/agent/interview/answer with that sessionId returns next question
- [ ] POST /api/agent/interview/complete deletes the Redis key
- [ ] All three routes return 401 without auth token
- [ ] No TypeScript errors from un-awaited async session calls

### Timeout (task-03c)
- [ ] `export const maxDuration = 60` present in report-conversational/route.ts
- [ ] Normal flow (fast LLM) still returns correct response
- [ ] Timeout response shape: { status: "partial", sessionId, incidentId, message }

### VoiceInputScreen (task-03d)
- [ ] Component exists at components/voice-input-screen.tsx
- [ ] Props interface matches the frozen definition in task-03d exactly
- [ ] Renders correctly in browser — question, controls, transcript, Done button
- [ ] Done disabled when transcript < 10 chars, enabled at >= 10
- [ ] ErrorBoundary exists at components/error-boundary.tsx
- [ ] ErrorBoundary shows recovery UI when child throws

### State Machine (task-03e)
- [ ] app/staff/report/page.tsx uses ReportPhase state
- [ ] Navigating splash → tier1_board → answering → tier1_board works
- [ ] VoiceInputScreen renders correctly in answering phase
- [ ] ErrorBoundary wraps the page and resets to splash on error
- [ ] No sequential question model code remains

### Build Gate
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] No console errors when loading /staff/report in the browser

---

## Documentation to Produce

After all checklist items pass, create or update these files:

1. `documentation/waik/04-AGENTIC-ARCHITECTURE.md`
   - Redis session store: key pattern, TTL, failure mode
   - Session consumer map: which routes call which session functions
   - Timeout handling: maxDuration, Promise.race, partial response shape

2. `documentation/waik/08-COMPONENTS.md`
   - VoiceInputScreen: full props interface, usage examples
   - ErrorBoundary: usage pattern, onReset behavior

3. `documentation/waik/09-STATE-MACHINES.md` (create if not exists)
   - ReportPhase state machine: all states and valid transitions
   - ActiveQuestion type definition
   - Where task-04b slots in

4. Create `plan/pilot_1/phase_2/task-03-EPIC-DONE.md`:

```markdown
# Task 03 — Core Hardening Epic — COMPLETE

## Subtasks completed
- [x] task-03a — Redis session store migration
- [x] task-03b — Wire all session consumers
- [x] task-03c — Report-conversational timeout + maxDuration
- [x] task-03d — VoiceInputScreen component + ErrorBoundary
- [x] task-03e — Staff report state machine + placeholder
- [x] task-03f — Verification, docs, rollup

## What was built
- In-memory Map session store replaced with Redis on Redis Cloud (Azure East US)
- All five interview/agent routes now use async Redis session functions
- report-conversational route protected against Vercel 504 with maxDuration=60 and 45s internal timeout
- VoiceInputScreen built as standalone reusable component with Wake Lock, iOS fallback, text fallback
- ErrorBoundary created for crash recovery
- Staff report page refactored to ReportPhase state machine — sequential model removed
- Question board placeholder ready for task-04b

## What comes next
- task-04  — PWA foundation
- task-04b — Question Board component (slots into the ReportPhase placeholders)
- task-05  — Staff Dashboard with real data
```

---

## Implementation Prompt

This task has no Cursor prompt. It is a manual verification task.

Work through the integration checklist above item by item. For each item:
  - If it passes: check the box
  - If it fails: open a Cursor session targeting the specific failing task
    (task-03a through task-03e) and fix the issue before continuing

Only create the documentation files and DONE files after every checklist
item has been checked.

---

## Post-Task

After task-03f is complete, the next task is:
  `plan/pilot_1/phase_2/task-04-pwa-foundation.md`

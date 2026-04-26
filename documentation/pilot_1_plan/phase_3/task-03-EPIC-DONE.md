# Task 03 — Core Hardening Epic — COMPLETE

## Subtasks completed

- [x] task-03a — Redis session store migration (`task-03a-redis-session-store-done.md`)
- [x] task-03b — Wire all session consumers (`task-03b-wire-session-consumers-done.md`)
- [x] task-03c — Report-conversational timeout + maxDuration (`task-03c-timeout-maxduration-done.md`)
- [x] task-03d — VoiceInputScreen component + ErrorBoundary (`task-03d-voice-input-screen-done.md`)
- [x] task-03e — Staff report state machine + placeholder (`task-03e-state-machine-done.md`)
- [x] task-03f — Verification, docs, rollup (`task-03f-verification-rollup-done.md`)

## What was built

- In-memory `Map` for investigator session state was replaced with **Redis** (keys `waik:session:*`, TTL 7200s). A separate **interview work session** store (`waik:interview-work:*`) supports `/api/agent/interview/*` with `sessionId` in responses.
- **Session consumers** use **awaited** async Redis calls in `lib/agents/expert_investigator/graph.ts`, preflight `getSession` on `report-conversational` **answer** for 404 on missing session, and interview routes validate `sessionId` / user where applicable.
- **report-conversational** is guarded with **`maxDuration = 60`**, a **45s** internal `Promise.race`, and **200 + `{ status: "partial", ... }`** on timeout; `updateInvestigationProgressOnTimeout` in `lib/db.ts` persists completeness without marking investigation completed.
- **VoiceInputScreen** and **ErrorBoundary** were added as standalone components for the board + answer flow.
- **Staff report** (`/staff/report`) was refactored to a **`ReportPhase` state machine** with board placeholders; the old sequential voice conversation UI was removed from that page. **Task-04b** will replace placeholders with the real question board (see `documentation/waik/09-STATE-MACHINES.md`).

## What comes next

- [task-04-pwa-foundation.md](./task-04-pwa-foundation.md) — PWA foundation
- Task-04b — Question board component (slots into `tier1_board` / `tier2_board` / `closing` placeholders)
- Later — Staff dashboard and live wiring (e.g. task-05) per plan

## Documentation

- `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — updated with Redis, consumer map, timeouts
- `documentation/waik/08-COMPONENTS.md` — VoiceInputScreen + ErrorBoundary
- `documentation/waik/09-STATE-MACHINES.md` — ReportPhase contract

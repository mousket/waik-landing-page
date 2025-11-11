

### Prompt 1 — “Data model & helpers”
**Goal:** Extend the incident schema to capture the full reporter → investigator flow and add the service helpers that both agents will call.  
**Cursor prompt:** inspect `lib/types.ts`, `data/db.json`, and `lib/db.ts`; add `initialReport` blocks (narrative, resident state, environment), investigator metadata (`investigationStatus`, `investigationStartedAt`, `subtype`), notification scaffolding, and enrich the question structure (`source`, `generatedBy`, `assignedTo`). Implement helpers such as `createIncidentFromReport`, `queueInvestigationQuestions`, `markInvestigationComplete`, and ensure `getIncidentsByStaffId` returns incidents where the user is the reporter (staff or admin), is explicitly assigned, or has questions directed to them. The queue helper should mirror the existing add-question flow, including vectorizing every queued question (and later its answer) with metadata covering the reporter, assignees, and timestamps. Require docstrings or brief usage notes for each helper.  
**Test after run:** run `pnpm lint` (or `tsc`) and execute a quick script/REPL snippet that calls `createIncidentFromReport`, then re-read `db.json` to confirm all new fields persist with vectorization metadata stubs.

---

### Prompt 2 — “Reporter agent + API”
**Goal:** Implement Agent 1 (LangGraph) and the `POST /api/agent/report` route that the new wizard calls.  
**Cursor prompt:** have it scaffold `agents/report_agent.ts` with nodes `start_report`, `capture_narrative`, `create_incident_and_handoff`, `node_exit_message`, wired to the helpers from Prompt 1. Ensure the handoff node creates the incident (with initial report details), triggers admin notifications, and asynchronously calls the investigator endpoint. Flesh out `app/api/agent/report/route.ts` to stream responses/logs back to the UI.  
**Test:** run `pnpm dev`, hit the endpoint with `curl` (mocking resident/narrative payload), and confirm `db.json` contains the new incident, initial answered questions, and that the investigator trigger logs fire.

---

### Prompt 3 — “Investigator agent + trigger endpoint”
**Goal:** Build Agent 2 (`agents/investigation_agent.ts`) plus the `POST /api/agent/investigate` API.  
**Cursor prompt:** reference the blueprint: nodes `load_and_analyze`, `classify_subtype`, `conditional_router`, subtype-specific `expert_question_generator` nodes, `de_duplicate_questions`, and `queue_questions`. Require the subtype and investigation status fields to be persisted, reuse the helpers from Prompt 1, handle missing templates gracefully, and always log/return safe fallbacks.  
**Test:** Manually invoke the endpoint with an existing `incidentId`; verify `subtype`/`investigationStatus` update in `db.json` and that deduped follow-up questions appear with `source: "ai-generated"`.

---

### Prompt 4 — “Notifications & admin tools”
**Goal:** Complete the notification loop so admins know about new incidents and investigator output immediately.  
**Cursor prompt:** scaffold a lightweight `lib/notifications.ts` (or similar) with helpers to create/fetch/acknowledge notifications, add REST endpoints (`/api/admin/notifications`, etc.), and update dashboard fetches with cache-busting/no-store options. Mention tying notifications to both incident creation and queued questions.  
**Test:** run through the create → investigate flow and confirm admin dashboards show the new incident and queued questions without hard refresh; notifications should mark read/unread correctly.

---

### Prompt 5 — “Staff UI integration”
**Goal:** Wire the front-end screens to the new backend capabilities.  
**Cursor prompt:** update the incident creation wizard to surface API progress/errors, show post-submit success, and guard against duplicate submissions. On `app/staff/incidents/[id]/page.tsx` and `app/admin/incidents/[id]/page.tsx`, render the investigator question queue with source badges, assignment chips, and answer entry. Ensure follow-up actions re-fetch using cache-busting.  
**Test:** end-to-end manual flow—use the voice wizard, land on the dashboard, open the incident detail, answer a question, and see updates reflected immediately on both staff and admin views.




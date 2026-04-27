# 4b-01 — IDT team roster + questions + reminders

## Estimated time: 6–10 hours  
## Depends on: phase 4b baseline (shell + `idtTeam` on `Incident` model)  
## Blocks: 4b-04 (push for reminders can reuse your wiring)

---

## Why

The Phase 2 shell currently shows a **read-only** IDT list (or empty). The Task 09 spec requires: **add team members** (search staff in facility), show **status and question counts**, **compose or AI-suggest questions** to members, list **sent questions** with responses, and **remind** when overdue (&gt; 24h).

The incident model already has `idtTeam` with fields like `userId`, `name`, `role`, `questionSent`, `response`, `status` (see `backend/src/models/incident.model.ts` and `lib/types.ts`). You may need a **dedicated API** to push members with validation (duplicate check, same facility) instead of sending a full unbounded PATCH from the client.

---

## In scope

- **Add IDT member**: search users in **same facility** (reuse patterns from `app/api/users` or staff list APIs used on admin settings). Persist to `incident.idtTeam` (append; no duplicates by `userId`).
- **Remove member** (optional if spec requires): only when no pending questions, or with confirmation; document the rule in code comment.
- **Send question to IDT member**:
  - Option A: extend `POST /api/incidents/[id]/questions` to accept `assignedTo: [userId]` and fields that mark this as a **Phase 2 / IDT** question (e.g. metadata), **or**
  - Option B: new `POST /api/incidents/[id]/idt-questions` that creates a `Question` subdoc consistent with the existing schema.
- **IDT tab UI** in `Phase2InvestigationShell` (or extracted component): list members, counts, “send question” composer (textarea + staff picker from IDT or facility staff), “questions sent” table driven from `incident.questions` filtered by metadata/assignment.
- **Overdue &gt; 24h**: show “Send reminder” on pending rows; call existing `POST /api/push/send` (or a thin server wrapper) with a fixed payload as in Task 09. **Idempotent**: do not double-notify in a single session without UX guard.

## Out of scope (defer to 4b-04 / other tasks)

- Full “Screen 15” standalone page (unless you prefer a separate route) — a tab + modal is acceptable if UX matches spec.
- AI “generate 3–5 questions” (endpoint + UI) is **4b-02/optional**; here, stub button is OK if wired to 4b-02 follow-up with a clear TODO.

---

## Success criteria

- [ ] Facility-only staff search; cannot add a user from another `facilityId`.
- [ ] Added members persist after refresh; `GET /api/incidents/[id]` returns them.
- [ ] At least one path creates a real `questions[]` entry visible in IDT and in the Phase 1 Q&amp;A data model.
- [ ] Reminder uses push API with correct `targetUserId` (recipient); errors surface via toast, not silent fail.
- [ ] `typecheck` / `test` / `build` pass.

---

## Files to study first

- `components/admin/phase2-investigation-shell.tsx` (IDT tab)
- `app/api/incidents/[id]/questions/route.ts` (POST body, validation)
- `lib/db.ts` — `addQuestionToIncident` / questions serialization
- `app/api/push/send` or `lib/push-service.ts` (as referenced in repo)

---

## Implementation prompt (paste to agent)

```
You are completing WAiK Phase 4b task 4b-01 (IDT team + questions + reminders).

Goals:
1. Add API route(s) to add/remove IDT team members on an incident, scoped to the same facility as the incident and caller; use canAccessPhase2; validate userIds against Mongo UserModel for that facilityId.
2. Wire the "IDT & questions" tab in components/admin/phase2-investigation-shell.tsx: search/add member UI, list members with name/role/status, show counts of questions assigned per member (derive from incident.questions and idt metadata if needed).
3. Implement "send question": persist using the existing Question model on the incident (POST /api/incidents/[id]/questions or a new route if you must add metadata). Use admin context query string on fetches and credentials: "include".
4. List sent questions in the same tab: text, assignee, sent time, answered/pending; if pending and older than 24h from question askedAt, show a "Remind" button that POSTs to the existing push send endpoint with title/body per product copy.
5. No cross-facility data. Keep diffs focused; do not rewrite unrelated admin pages.
6. Run: npm run typecheck && npm test && npm run build — fix all failures.

If the current questions API cannot carry Phase 2 metadata, extend the schema in a backward-compatible way (optional fields) and document in a short comment in the route file.
```

---

## Verification

- **Manual**: claim Phase 2, add a staff member, send a question, see it in API JSON and in UI, trigger reminder in dev (or mock if push is disabled).
- **Automated**: add a small unit test for “24h overdue” date helper if you extract one (optional; put under `__tests__/`).

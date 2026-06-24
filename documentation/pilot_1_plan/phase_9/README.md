# Phase 9 — Report persistence & resume

**Last updated:** 2026-05-21  
**Status:** **IMPLEMENTED (v1)** — tasks **22–28** complete; manual pilot QA pending.

This phase closes the gap between the **Redis report session** (`/api/report/*`) and **MongoDB incident records** (`GET /api/incidents/[id]`, staff/admin incident detail). Tier 1/2/closing Q&A and draft narrative are mirrored to Mongo during reporting and on sign-off.

**Depends on:** Phase IR-1 report routes. Phase 10 task-32 delivered gap-analysis retry UX (task-27 verify-only).

---

## Epic folder

**`documentation/pilot_1_plan/phase_9/`**

Agents should read **`AGENT-HANDOFF.md`** first.

---

## Task index

| Order | ID | Task | Task file | Status |
|------:|----|------|-----------|--------|
| 1 | **22** | Sync helper: `ReportSession` → `incident.questions[]` | [task-22-sync-session-to-incident-done.md](./task-22-sync-session-to-incident-done.md) | **Done (v1)** — `lib/report/sync-session-to-incident.ts` + tests |
| 2 | **23** | Checkpoints in `report/answer` + seed on `report/start` | [task-23-checkpoint-and-seed-done.md](./task-23-checkpoint-and-seed-done.md) | **Done (v1)** — `persistReportCheckpoint` on every answer |
| 3 | **24** | Full question flush on `report/complete` | [task-24-complete-flush-done.md](./task-24-complete-flush-done.md) | **Done (v1)** — `questions` + `$unset` active session |
| 4 | **25** | `activeReportSessionId` + `GET /api/report/resume` | [task-25-resume-api-done.md](./task-25-resume-api-done.md) | **Done (v1)** — resume route + Mongo reconstruction |
| 5 | **26** | Report page + Answer Now + dashboard `?incidentId=` | [task-26-report-resume-ui-done.md](./task-26-report-resume-ui-done.md) | **Done (v1)** — staff report hydrate + deep links |
| 6 | **27** | Gap analysis retry UX | [task-27-gap-analysis-retry-done.md](./task-27-gap-analysis-retry-done.md) | **Done (v1)** — Phase 10 task-32 (verify only) |
| 7 | **28** | Integration tests + sign-off | [task-28-integration-verification-done.md](./task-28-integration-verification-done.md) | **Done (v1)** — `report-session-sync` tests |

---

## What’s done vs what remains

### Done

- Mongo checkpoints on `report/start` and every `report/answer` branch.
- Full `questions[]` flush on `report/complete`.
- `GET /api/report/resume?incidentId=` with Redis hit or Mongo → new session.
- Staff `/staff/report?incidentId=`, Answer Now, dashboard in-progress → resume URL.
- Unit tests: `__tests__/report-session-sync.test.ts`.

### Remains

- Manual QA matrix in task-28 (device/staging).
- Tick Phase 9 checkboxes in `PILOT_READY.md` after QA.

---

## Files created / modified (phase 9 v1)

| File | Change |
|------|--------|
| `lib/report/sync-session-to-incident.ts` | **New** — question + draft mapping |
| `lib/report/checkpoint-incident.ts` | **New** — Mongo `$set` helper |
| `lib/report/reconstruct-session-from-incident.ts` | **New** — resume reconstruction |
| `app/api/report/resume/route.ts` | **New** |
| `app/api/report/start/route.ts` | Seed Tier 1 questions |
| `app/api/report/answer/route.ts` | `saveReportSession` checkpoints |
| `app/api/report/complete/route.ts` | Full questions + unset active session |
| `backend/src/models/incident.model.ts` | `activeReportSessionId`, `activeReportPhase` |
| `app/staff/report/page.tsx` | Resume from query param |
| `components/staff/staff-incident-detail-view.tsx` | Answer Now link |
| `app/staff/dashboard/staff-dashboard-client.tsx` | In-progress → resume |

---

## Verification

```bash
npm test -- report-session-sync
npm run build
```

---

## Related

- Phase 10 Tier 2 quality: [`../phase_10/README.md`](../phase_10/README.md)
- Blueprint: [`../incident_report/WAiK_Incident_Reporting_Blueprint.md`](../incident_report/WAiK_Incident_Reporting_Blueprint.md)
- [`../PILOT_READY.md`](../PILOT_READY.md)

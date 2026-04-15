# Task 02 — DONE (Multi-tenant isolation + data model)

## Implemented

- **`lib/db.ts`**: All incident reads/writes scoped by `facilityId`. `getIncidents(facilityId)`, `getIncidentById(id, facilityId)`, `getIncidentsByStaffId(staffId, facilityId)`, `getIncidentForUser(id, user)` (404 / 403 / ok), `createIncidentFromReport` requires `facilityId` (+ optional `organizationId`), `updateIncident`, `addQuestionToIncident`, `answerQuestion`, `deleteQuestion`, `queueInvestigationQuestions`, `markInvestigationComplete` take `facilityId` where needed. New incidents get analytics defaults, `phase2Sections` initializer, `auditTrail: []`.
- **`lib/db-facility.ts`**: `facilityDb(facilityId)` per task spec.
- **`lib/types.ts`**: Expanded `Incident`, `Intervention`, `Phase2SectionStatus`, `DeviceType`; legacy `UserRole` includes deprecated `"admin"` for existing UI comparisons.
- **`backend/src/models/incident.model.ts`**: Analytics fields, `phase2Sections` subdocument, `auditTrail`, `organizationId`, compound indexes on `facilityId`.
- **`backend/src/models/intervention.model.ts`**: New model + compound index.
- **`backend/src/models/user.model.ts`**: Expanded legacy `role` enum; `deviceType` unchanged.
- **`backend/src/services/incident.service.ts`**: Optional `facilityId` on queries/updates for Express compatibility.
- **API routes** under `app/api/incidents/**` and agent routes: `getCurrentUser()`, facility scoping, 403 for wrong facility via `getIncidentForUser`.
- **Agents**: `runInvestigationAgent(incidentId, facilityId)`, report + interview + conversational investigator paths pass facility from session.

## Verification

- `npm run test` — pass  
- `npm run build` — pass (project skips `tsc` in build; `npx tsc --noEmit` may still report unrelated Clerk typings in admin staff routes)

## Follow-ups (manual / later)

- Refresh `documentation/waik/02-DATABASE-SCHEMA.md` and `03-API-REFERENCE.md` with new fields and `facilityId` rules when you want docs in sync.
- Migrate legacy incidents without `facilityId` in Mongo (treated as inaccessible to non–super-admin users until backfilled).

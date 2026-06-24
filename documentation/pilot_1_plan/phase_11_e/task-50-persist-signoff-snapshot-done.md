## Status: DONE — 2026-06-07
## Phase: 11e — Persist sign-off snapshot
## Estimated Time: 2–3 hours
## Depends On: Phase 11c preview insights (`lib/agents/clinical-preview-insights.ts`)

---

## Why This Task Exists

The sign-off preview generates **clinical summary** and **WAiK recommendations** (nurse + administrator perspectives). These are cached on the Redis report session as `generatedPreviewInsights` but **deleted** when `POST /api/report/complete` runs. Nurses cannot re-open the exact document they signed.

---

## What This Task Creates / Modifies

1. **`backend/src/models/incident.model.ts`** + **`lib/types.ts`**
   - Add to `IncidentInitialReport`:

```typescript
phase1SignoffSnapshot?: {
  expertNurseSummary: string
  nurseRecommendations: string
  administratorRecommendations: string
  clinicalRecord: ClinicalRecord  // final edited sections as signed
  signedAt: Date
}
```

2. **`app/api/report/complete/route.ts`**
   - Before `deleteReportSession`, copy:
     - `session.generatedPreviewInsights` (or regenerate if missing)
     - Final `clinicalRecord` after `applyEditedSections`
   - `$set` on `initialReport.phase1SignoffSnapshot`
   - Keep existing `initialReport.signature.signatureImage` (PNG base64 — drawn or typed)

3. **`lib/report/phase1-signoff-snapshot.ts`** (**new**)
   - Shared helpers: `applyEditedSections`, `buildPhase1SignoffSnapshot`, `resolvePreviewInsightsForSignoff`, `phase1SignoffSnapshotForMongo`

4. **`__tests__/signoff-snapshot.test.ts`**
   - Assert complete payload includes snapshot fields when session has insights

---

## Success Criteria

- [x] After sign-off, `GET /api/incidents/[id]` returns `initialReport.phase1SignoffSnapshot` with all three insight strings
- [x] `clinicalRecord` in snapshot matches nurse edits at submit time
- [x] `signatureImage` present for both draw and type flows
- [x] `npm run test` passes

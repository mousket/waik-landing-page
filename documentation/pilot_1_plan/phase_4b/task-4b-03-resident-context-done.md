# 4b-03 — Resident context tab (interventions, incident pattern, assessments)

## Estimated time: 5–8 hours  
## Depends on: `GET /api/residents/[id]`, `GET /api/incidents` with filters, task-08 components if present

---

## Why

`Phase2InvestigationShell` currently **stubs** the Resident context tab. Task 09 required: **intervention history** (align with Resident Story), **incident pattern** (counts 30/90/180, type mix, **alert if ≥3 in 30 days**), and **recent assessments** (dietary + activity completeness if available in API).

This tab should be **lazy-loaded** (e.g. `React.lazy` or `dynamic()` with `ssr: false` only if needed) so the main shell stays fast.

---

## In scope

- **Data**: When `incident.residentId` is set, fetch:
  - Resident details (`GET /api/residents/[id]`)
  - Interventions (`GET /api/residents/[id]/interventions`)
  - Incidents for that resident: use existing `GET /api/incidents?residentId=...` or the pattern used on `app/admin/residents/[id]/page.tsx` (verify query params in `app/api/incidents/route.ts`).
- **Intervention history UI**: Reuse a component from Resident Story (task-08) if the repo has `components/.../resident` pieces; else implement a compact list with **active** vs **removed** (strikethrough) matching resident intervention fields (`isActive`, `removedAt`, etc.).
- **Pattern panel**: Counts in **last 30 / 90 / 180 days**, exclude or include `closed` per product (document choice); show simple breakdown by `incidentType` if `map-incident` utilities exist; **amber alert** for repeat pattern rule from Task 09.
- **Assessments**: If assessment APIs exist (Phase 4 assessments work), show last 1–2 completed or due with scores; if not in API, show “Not available” with a single TODO in 4b-06 — do not hardcode fake scores.

## Out of scope

- EHR or MDS full charts.
- Editing interventions from this tab (unless product explicitly wants “Add” — that remains primary on resident routes).

---

## Success criteria

- [ ] Tab loads without layout shift; errors show inline, not a blank tab.
- [ ] No PII from other residents; all requests scoped by `facilityId`.
- [ ] `typecheck` / `test` / `build` pass.

---

## Files to study

- `components/admin/phase2-investigation-shell.tsx` (tab `res`)
- `app/admin/residents/[id]/page.tsx` (how it fetches)
- `lib/map-incident-summary.ts` (types for filters)
- `app/api/incidents/route.ts` (query by resident)

---

## Implementation prompt (paste to agent)

```
You are completing WAiK phase 4b-03: Resident context tab in Phase2InvestigationShell.

1. When incident.residentId is present, fetch resident + interventions + incidents for that resident using the same admin query context as the rest of /admin (getAdminContextQueryString, credentials: "include"). Handle loading and error states in the "Resident context" tab.

2. Render intervention list matching facility/resident scoping. Prefer importing an existing list component from the Resident Story / residents admin UI; if you extract shared UI, place it in components/ with a neutral name and reuse from one place.

3. Compute incident pattern windows (30/90/180 days) in the client from returned incidents or a small server helper. Show counts and a visible amber alert if >=3 incidents in 30 days (copy from Task 09). Document any assumption about which phases count as "incidents" in a code comment.

4. Pull assessment summaries if GET /api/assessments or admin assessments endpoints can return last dietary/activity; otherwise show a short empty state and link to /admin/assessments.

5. Keep bundle size reasonable: lazy import heavy children if needed. Run npm run typecheck && npm test && npm run build; fix all issues.
```

---

## Verification

- Manual: open an incident with `residentId` in seed data; confirm interventions and pattern numbers match a quick DB or API spot-check.
- If no `residentId` in dev data, add a one-line note in 4b-06 for pilot seeding.

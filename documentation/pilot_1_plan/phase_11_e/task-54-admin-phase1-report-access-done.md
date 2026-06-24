## Status: DONE — 2026-06-07
## Phase: 11e — Admin access to signed Phase 1
## Estimated Time: 1–2 hours
## Depends On: task-51

---

## Why This Task Exists

DON and administrators need the **same signed Phase 1 record** the nurse submitted when starting Phase 2 — without impersonating the reporter.

---

## What This Task Creates / Modifies

1. **`app/admin/incidents/[id]/phase1-report/page.tsx`** (**new**)
   - Admin route rendering read-only `Phase1SignedReportView` (same as staff signed view)
   - Auth: `isAdminTier` or WAiK super-admin via `getIncidentForUser`

2. **`components/admin/phase2-investigation-shell.tsx`**
   - Phase 1 record tab: **View signed Phase 1 report**, **Download PDF**, **Email report**

3. **`app/api/incidents/[id]/report/email/route.ts`**
   - Admin tier already authorized (task 53)

---

## Success Criteria

- [x] DON can open signed Phase 1 from admin incident workspace
- [x] PDF download works for admin without being the reporter
- [x] UI matches staff signed view (read-only)

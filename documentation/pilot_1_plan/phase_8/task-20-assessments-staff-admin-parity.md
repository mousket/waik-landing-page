# Task 20 — Assessments parity (replace staff placeholder; share with admin)
## Phase: 8 — Staff–admin operational surface parity
## Estimated Time: 5–8 hours
## Depends On: Task 19; existing `app/admin/assessments/page.tsx` + `/api/admin/assessments`

---

## Why This Task Exists

`app/staff/assessments/page.tsx` is currently a **placeholder** empty state. Admin assessments already load **real rows**. Staff must see **due and relevant assessments** with the same core presentation as admin, using **staff-safe** data access (staff API route or shared server logic with role checks)—not by calling admin-only endpoints from the browser.

---

## Success Criteria

- [ ] Staff assessments page lists **real data** when the backend has assessments for the staff user’s facility (mirror admin semantics where product allows).
- [ ] Shared UI module for row cards/table (match admin information hierarchy: resident/room, type, status, due date, completeness when present).
- [ ] New or extended **`/api/staff/assessments`** (or equivalent) returns only fields staff may see; **403** for unauthorized roles.
- [ ] Admin page refactored to consume the **same presentational component** (or shared hook + shared row).
- [ ] Loading, error, and empty states consistent with Tasks 18–19.
- [ ] `app/staff/assessments/[type]/page.tsx` remains functional or is intentionally linked from the list; fix broken navigation if discovered.

---

## Test Cases

```
TEST 1 — Staff sees rows
  Setup: Seed or use env with assessments due
  Action: Open /staff/assessments as staff
  Expected: Non-placeholder list; matches admin row semantics (subset OK if RBAC requires)

TEST 2 — No admin API from staff browser
  Action: Network tab on staff assessments
  Expected: No unauthorized calls to /api/admin/assessments unless middleware proves shared cookie role — prefer dedicated /api/staff/assessments

TEST 3 — Admin unchanged functionally
  Action: /admin/assessments
  Expected: Same data as before task; facility context respected

TEST 4 — Empty state
  Action: Facility with zero assessments
  Expected: Clear empty state (staff vs admin copy may differ)
```

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Phase 8 Task 20 — Assessments staff/admin parity.

1. Inspect app/admin/assessments/page.tsx and app/api/admin/assessments/route.ts (or actual path).
2. Implement GET handler for staff assessments mirroring facility scope rules used elsewhere for staff (follow patterns from /api/staff/incidents).
3. Replace app/staff/assessments/page.tsx placeholder with a client that fetches staff endpoint.
4. Extract shared presentation from admin page into a reusable component; admin and staff pass rows + link builders.
5. Ensure shell scroll rules (min-h-0 chain) still hold.

Do not expose admin-only fields to staff. Document any intentional field differences in code comments briefly.
```

---

## Notes for implementers

- If product requires **“only my assigned assessments”** for staff, filter in the staff route and state that in the API contract comment.
- Align date urgency styling (`overdue` / `due_soon`) with admin helpers if extracted.

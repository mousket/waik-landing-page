# Task 19 — Residents list parity (staff + admin shared surfaces)
## Phase: 8 — Staff–admin operational surface parity
## Estimated Time: 5–8 hours
## Depends On: Task 18 (shared patterns established); facility-scoped `/api/residents` usage on admin

---

## Why This Task Exists

`app/staff/residents/` and `app/admin/residents/page.tsx` use different layouts and capabilities. Admin includes **create resident** dialog and table-centric UX; staff uses search/list clients. Phase 8 aligns **shared search, row layout, loading/empty states, and typography** while keeping **admin-only affordances** behind explicit props or a small admin-only wrapper.

---

## Success Criteria

- [ ] Shared component(s) for resident **search + results list** (or table rows) used by staff and admin pages.
- [ ] **Create resident** (and any other admin-only controls) remain **absent** for staff or disabled with no API path for staff to invoke create.
- [ ] Admin links to resident detail use **`buildAdminPathWithContext`** (or current canonical pattern) so facility context is preserved.
- [ ] Staff links target **`/staff/...`** resident flows as today (or updated consistently if detail routes differ).
- [ ] Consistent empty/error loading UX with Task 18 patterns (PageHeader, cards, skeletons).

---

## Test Cases

```
TEST 1 — Staff residents
  Action: /staff/residents — search and open a resident
  Expected: Works as before; UI aligns with admin list rhythm

TEST 2 — Admin residents
  Action: /admin/residents — search, create resident (if permitted)
  Expected: Create flow works; table/list matches shared components

TEST 3 — Staff cannot create
  Action: Staff session — inspect UI and network
  Expected: No create resident control; no POST to admin-only create endpoint from staff UI

TEST 4 — Context preservation
  Action: Admin with facility query params navigates resident → back to list
  Expected: Query context preserved
```

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Phase 8 Task 19 — Residents staff/admin parity.

1. Read app/staff/residents/staff-residents-client.tsx and app/admin/residents/page.tsx.
2. Extract shared UI for search field, results list/table body, loading skeletons, empty states.
3. Pass role-specific props: showCreateButton, onCreateResident, link builder for row navigation (staff vs admin paths), optional extra columns for admin.
4. Preserve admin facility context in all admin Links.
5. Keep scope minimal: no unrelated resident detail refactors.

Confirm RBAC: staff UI never exposes resident creation if only admins may create in this product.
```

---

## Notes for implementers

- If staff and admin hit different API shapes, add a thin **normalizer** in `lib/` rather than `any` in JSX.
- Match **`waik-ui-ux-patterns`** for scroll: residents pages live inside shells that already implement `min-h-0`—do not break that chain.

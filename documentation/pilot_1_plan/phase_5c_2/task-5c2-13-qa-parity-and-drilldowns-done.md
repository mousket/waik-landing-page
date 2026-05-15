# Task 5c2-13 — QA: Responsive Ordering, Visual Parity, Drilldowns (Done)
## Phase: 5c-2 — Admin/DON Executive View (Trends)

---

## Outcome

### Responsive ordering
- **Mobile (375px):** E1–E8 in `AdminTrendsView`, then weekly brief in main column (`lg:hidden`); sidebar hidden on small screens (`hidden lg:block` on trends aside).
- **Desktop:** Main column E1–E8; sticky sidebar weekly brief (`lg:sticky`, internal scroll).

### Visual parity
- Range toggle and jump chips match Daily Command pill / gradient grammar.
- Cards use compact sparklines and calm copy (no placeholder type tiles in trends lists).

### Drilldowns
- All KPI tiles and list rows link via `trends-drilldowns.ts` + `buildAdminPathWithContext`.
- Pattern insights: every insight has “View evidence”.
- `/admin/incidents` and `/admin/residents` apply Trends query params from URL.

### Tests
- `__tests__/trends-drilldown-parity.test.ts` — parse helpers, href builders, snapshot envelope shape.

---

## Success Criteria (verified)

- [x] Trends view is polished and trustworthy.
- [x] Phase 5c-2 Executive View ready for handoff.

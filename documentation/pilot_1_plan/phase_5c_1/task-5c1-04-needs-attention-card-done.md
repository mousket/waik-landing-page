# Task 5c1-04 — A3 Needs Attention (Today Queue Card) + Deep Links
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 3–5 hours
## Depends On: 5c1-01 layout rails

---

## Why This Task Exists

“Needs Attention” is the admin’s operational backlog. It must be presented as a calm, grouped queue — not a wall of incidents.

---

## Card Contents (A3)

- A compact grouped list (max ~8 visible rows; “View queue” for full list).
- Group by blocker (v1):
  - Missing info
  - Awaiting follow-up
  - Ready for sign-off

Each row includes:
- Incident type pill + resident + unit (if available)
- Age (e.g., “26h open”)
- Blocker label
- Single CTA (Request info / Assign / Sign)

---

## Deep Links

- “View queue” should route to an appropriate admin list surface (existing `/admin/incidents` with filters, or a dedicated queue route).
- Row click opens incident detail.

---

## Success Criteria

- [ ] Card renders in A3 position.
- [ ] Items grouped by blocker with clear headings.
- [ ] Deep links work; row click works.
- [ ] No more than one primary CTA per row.


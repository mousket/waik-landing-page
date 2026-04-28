# Task 5c1-12 — QA: Scroll Chain, Responsive Ordering, Visual Parity
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–3 hours
## Depends On: 5c1-01 through 5c1-11 complete

---

## Why This Task Exists

Dashboards fail in practice due to scroll bugs, cramped responsive layouts, and subtle styling drift. This task ensures the admin Daily Command is merge-ready and matches staff dashboard polish.

---

## QA Checklist

### Layout + scroll
- [ ] Admin shell bounds viewport correctly (no double-scroll)
- [ ] Main column scrolls; sidebar is sticky on desktop
- [ ] Shortcuts/chips scroll to correct anchors

### Responsive ordering
- [ ] 375px: A1 → A2 → A3 → A4 → A5 → A6 → A7 → brief
- [ ] Tablet: cards remain readable; no cramped multi-column grids

### Visual parity
- [ ] Tabs/chips match staff dashboard styles (rounded-2xl, subtle gradients, active shadow)
- [ ] Badges and pill language consistent across roles
- [ ] No reintroduction of “old” admin-only card styles

### Behavior sanity
- [ ] Hero card never exceeds 3 items
- [ ] High-risk residents never exceeds 5
- [ ] Outlier card never exceeds small row count (no hidden tables)

---

## Success Criteria

- [ ] No scroll regressions across admin routes
- [ ] Visual parity achieved; daily command feels like the same product as staff
- [ ] Ready for another agent to implement Executive View next (phase_5c_2)


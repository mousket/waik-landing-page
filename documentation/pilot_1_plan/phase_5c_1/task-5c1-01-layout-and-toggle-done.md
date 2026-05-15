# Task 5c1-01 — Daily Command Layout + Today/Trends Toggle (Today wired)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–3 hours
## Depends On: existing admin dashboard foundation (`components/admin/admin-dashboard-shell.tsx`)

---

## Why This Task Exists

Before building individual cards, we need the **layout rails** that enforce:
- correct ordering (mobile + desktop)
- correct scroll behavior (admin shell constraints)
- a persistent, simple **Today / Trends** view toggle

Trends can be stubbed (disabled or “coming soon”) in this task; Today must be wired.

---

## Requirements

- [ ] `/admin/dashboard` defaults to **Today** view.
- [ ] Add a small header toggle (pill tabs) for **Today** | **Trends**.
- [ ] The layout supports:
  - main column stack for A1–A7
  - right sidebar (desktop) for S1–S2 (sticky)
  - single-column collapse on mobile (brief becomes bottom card or button)
- [ ] Preserve facility context behavior (URL/localStorage) already implemented.

---

## Implementation Notes (Design Parity)

- Reuse the staff dashboard `TabsList` / `TabsTrigger` styling for the toggle:
  - `rounded-2xl`, border, muted gradient background, pill triggers with active gradient + shadow.
- Avoid introducing a new nav pattern (no new left-side subnav).

---

## Success Criteria

- [ ] Mobile ordering matches Phase 5c-1 README exactly.
- [ ] Desktop shows two columns (main + sidebar).
- [ ] Today/Trends toggle is visible and consistent with staff UI styling.
- [ ] No scroll regressions (main column scrolls; sidebar sticky works).


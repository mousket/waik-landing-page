# Task 5c1-12 — QA: Scroll Chain, Responsive Ordering, Visual Parity (Done)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–3 hours

---

## Outcome

- **Scroll chain:** `AdminAppShell` root already used `h-dvh min-h-0 max-h-dvh overflow-hidden`; main column uses `min-h-0 flex-1 overflow-y-auto`. Aligned the scroll region with **staff** (`touch-pan-y`, `overscroll-y-contain`) so mobile chaining feels the same.
- **Dashboard wrapper parity:** `AdminDashboardShell` outer root now matches staff (`min-h-0 flex-1`); inner max-width row uses `min-w-0` and `pb-10 sm:pb-8` so long pages clear the bottom nav without cramped endings.
- **Responsive ordering (375px):** Today tab renders **A1** (`#dc-a1`) → **A2–A7** (`#dc-a2` … `#dc-a7`) in one column → **Daily brief** (`#daily-brief`, `lg:hidden`) → open investigations. Matches the locked card order with brief after command cards on small screens.
- **Shortcuts:** Command header `scrollToAnchor` targets existing section ids; sections use `scroll-mt-24` under the fixed top bar. **View brief** scrolls to `#daily-brief`.
- **Visual parity:** Today/Trends and investigations `TabsList` / `TabsTrigger` already follow the shared pill + gradient pattern (`rounded-2xl`, border, active gradient + shadow). No reintroduction of legacy admin-only card chrome in this pass.
- **Data caps (sanity):** Hero ranks **top 3** (`rankDailyCommandHighestRisk` + slice); high-risk residents **top 5** (`admin-high-risk-residents-card`); staff throughput outliers capped in lib (**slice(0, 3)** for reporter load); needs-attention preview **max 8** rows in-card.

---

## QA Checklist (verified)

### Layout + scroll

- [x] Admin shell bounds viewport correctly (no double-scroll)
- [x] Main column scrolls; sidebar is sticky on desktop (`lg:sticky lg:top-20` + max height + internal scroll)
- [x] Shortcuts/chips scroll to correct anchors (`dc-a2`, `dc-a4`–`dc-a7`, brief)

### Responsive ordering

- [x] 375px: A1 → A2 → A3 → A4 → A5 → A6 → A7 → brief (then investigations pipeline below)
- [x] Tablet: cards stay single-column in the stack until `lg` sidebar; no extra multi-column grids on the command cards

### Visual parity

- [x] Tabs/chips match staff dashboard styles (rounded-2xl, subtle gradients, active shadow)
- [x] Badges and pill language consistent with staff / resident record patterns in this area
- [x] No reintroduction of “old” admin-only card styles in files touched for this QA pass

### Behavior sanity

- [x] Hero card never exceeds 3 items
- [x] High-risk residents never exceeds 5
- [x] Outlier / throughput lists are capped small counts (no hidden full tables)

---

## Success Criteria (verified)

- [x] No scroll regressions identified in the admin shell + dashboard chain for this pass
- [x] Daily Command reads as the same product family as staff (layout + tab styling + motion)
- [x] Phase 5c-1 app work complete; Executive View (phase 5c-2) can proceed independently

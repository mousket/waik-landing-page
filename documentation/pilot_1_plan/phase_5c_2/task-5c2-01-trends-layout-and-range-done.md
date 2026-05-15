# Task 5c2-01 — Trends Layout Rails + Date Range Control
## Phase: 5c-2 — Admin/DON Executive View (Trends)
## Estimated Time: 2–3 hours
## Depends On: 5c1-01 (toggle/layout rails for Today), existing admin facility context

---

## Why This Task Exists

Trends needs stable rails before any card work:
- consistent layout + scroll behavior
- a simple date range control (7d / 30d / 90d)
- consistent comparison semantics (“vs previous period”)

---

## Requirements

- [ ] `Trends` view is reachable via Today/Trends toggle (same styling as staff tabs).
- [ ] Add date range control for Trends only:
  - 7d / 30d / 90d
  - persisted in URL (`range=7d|30d|90d`)
- [ ] Comparison baseline is previous period of same length (e.g., 30d vs prior 30d).
- [ ] Layout ordering matches Phase 5c-2 README (mobile + desktop).

---

## Success Criteria

- [ ] Trend view loads with sane defaults (30d).
- [ ] Range switch updates all cards (even if placeholder data initially).
- [ ] No scroll regressions; sidebar sticky works on desktop.


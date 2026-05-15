# Task 5c2-03 — E2 Facility Health Summary (KPIs + deltas + definitions)
## Phase: 5c-2 — Admin/DON Executive View (Trends)
## Estimated Time: 3–5 hours
## Depends On: 5c2-01 layout rails, 5c2-11 data plan

---

## Why This Task Exists

This is the hero “executive glance” surface: small number of KPIs with deltas, not a dashboard of charts.

---

## KPI Tiles (3–5 max)

Include:
- Incidents (count, and rate if census available)
- Repeat incidents (count + %)
- Documentation completion (%)
- Median time-to-signoff (hours)
- Protection days distribution (Protected vs At risk vs Exposed)

Each tile shows:
- primary value
- delta vs previous period (up/down)
- subtle sparkline or mini bar (optional)
- “Definition” tooltip or disclosure (avoid confusion, build trust)

---

## Guardrails

- Never show more than 5 tiles.
- Prefer stable metrics; avoid vanity.

---

## Success Criteria

- [ ] Tile count stays within 3–5.
- [ ] Deltas are correct and clearly labeled “vs previous period.”
- [ ] Each tile deep-links to relevant drilldown (where applicable).


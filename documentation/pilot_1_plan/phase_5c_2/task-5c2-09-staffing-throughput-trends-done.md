# Task 5c2-09 — E8 Staffing / Throughput Trends (Support Lens)
## Phase: 5c-2 — Admin/DON Executive View (Trends)
## Estimated Time: 3–6 hours
## Depends On: 5c2-11 data plan (activity + backlog)

---

## Why This Task Exists

Trends must include the operational reality: documentation backlog and bottlenecks over time — framed as “where to support,” not surveillance.

---

## Card Contents (E8)

- Backlog trend (docs overdue) over the selected range
- Bottleneck reasons (top 3):
  - missing required fields
  - awaiting follow-up
  - permission/assignment issues
- Unit-level strain trend (top 2 units only)

Deep links:
- bottleneck click → filtered queue
- unit click → unit-specific view

---

## Guardrails

- Do not rank individuals.
- Keep it unit/process-level.

---

## Success Criteria

- [x] Card renders in E8 position.
- [x] Shows top 3 bottleneck reasons only.
- [x] No individual surveillance UI.

---

## Shipped (app)

| Piece | Path |
|-------|------|
| Types | `lib/types/trends-staffing-throughput.ts` |
| Metrics | `lib/admin/trends-staffing-throughput-metrics.ts` |
| API | `GET /api/admin/trends/staffing-throughput?range=7d\|30d\|90d` |
| Card | `components/admin/admin-trends-staffing-throughput-card.tsx` |
| Trends view | `components/admin/admin-trends-view.tsx` — section `#trends-e8` |
| Incidents drilldown | `lib/admin/parse-admin-incidents-url.ts` + `app/admin/incidents/page.tsx` — `bottleneck` query |

**E8 behavior:** Backlog sparkline + overdue count (current vs prior window); top **3** bottleneck reasons (`missing_info`, `awaiting_followup`, `missing_assignment`, `regulatory_clock` — ranked by count); top **2** units by strain. No reporter/individual rankings. Drilldowns: `bottleneck=…`, `unit=…`, `overdue_docs` on `/admin/incidents` with `range` preserved.


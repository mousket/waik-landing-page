# Task 5c2-10 — Weekly Brief (Trends Narrative) + Citations (Done)
## Phase: 5c-2 — Admin/DON Executive View (Trends)
## Estimated Time: 2–4 hours
## Depends On: Trends card metrics (5c2-03–5c2-09)

---

## Outcome

- **S1 Weekly brief** composes four evidence-linked sections from existing Trends aggregates (facility health, incidents, compliance, patterns, cohort, staffing).
- **`GET /api/admin/trends/weekly-brief?range=…`** returns structured bullets with `evidencePath` drilldowns.
- **Desktop:** sticky sidebar card (`hidden lg:block`).
- **Mobile:** “View brief” header button scrolls to `#trends-weekly-brief`; full card after E8 in the main column (`lg:hidden`).

---

## Brief sections (verified)

- What changed
- Where risk is rising or falling
- Biggest bottleneck
- Recommendations (1–3, observational)

Every bullet includes a number and a link to `/admin/incidents?…` or `/admin/residents?…`.

---

## Success Criteria (verified)

- [x] Brief renders in Trends sidebar (desktop) and is accessible on mobile.
- [x] Every bullet has evidence + link.

---

## Shipped (app)

- `lib/types/trends-weekly-brief.ts`
- `lib/admin/trends-weekly-brief-metrics.ts`
- `app/api/admin/trends/weekly-brief/route.ts`
- `components/admin/admin-trends-weekly-brief-panel.tsx`
- `components/admin/admin-dashboard-shell.tsx` — sidebar + mobile parity

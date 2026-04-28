# Task 5c2-11 — Data Contracts + Endpoints for Trends (API Plan)
## Phase: 5c-2 — Admin/DON Executive View (Trends)
## Estimated Time: 4–8 hours
## Depends On: existing incident/stats endpoints; Daily Command data work (5c1-10 helpful)

---

## Why This Task Exists

Trends requires period-based aggregation with drilldowns. This task defines stable contracts so card implementation doesn’t fragment into many one-off queries.

---

## Required Concepts

- `range`: 7d / 30d / 90d
- `baselineRange`: previous period of equal length
- `facilityId`, `organizationId`

All endpoints must support:
- summary values + deltas
- small timeseries (bucketed) for sparklines
- drilldown links: either link params or evidence IDs

---

## Data Surfaces Needed (v1)

### 1) Trends Snapshot (single payload)
For E1/E2:
- KPI values + deltas
- protection distribution over time
- definitions metadata (optional)

### 2) Incident Trends
- per-type counts over time (bucketed)
- severity mix
- largest mover
- drilldown params

### 3) Compliance Drift
- completion trend over time
- unit and role breakdown
- “biggest slip” callout

### 4) Pattern Insights Evidence Sets
Return up to 3 insight objects with:
- quantitative evidence line
- evidence IDs or drilldown params

### 5) High-risk Cohort Trends
- cohort count over time
- top driver trends (top 3)
- newly flagged count

### 6) Intervention Effectiveness
- list of up to 3 “before/after” items
- evidence params for both periods

### 7) Staffing/Throughput Trends
- backlog trend over time
- bottleneck reasons (top 3)
- unit strain (top 2)

---

## Guardrails

- Avoid returning raw incident lists in Trends payloads.
- Keep timeseries coarse (e.g., daily buckets for 30d, weekly buckets for 90d).
- Any LLM-generated narrative must include citations (IDs/links).

---

## Success Criteria

- [ ] Types exist in `lib/types/…` for Trends payloads.
- [ ] Cards can render from a small number of endpoints.
- [ ] Drilldowns are consistent and reliable.


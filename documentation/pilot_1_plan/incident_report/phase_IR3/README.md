# Phase IR-3 — Analytics + Data Strategy
## Epic Overview

---

## What This Phase Builds

The analytics and data strategy layer that transforms WAiK's captured
data into measurable proof that the system works. Weekly intelligence
reports that write themselves. Staff improvement trajectories that
show coaching impact. Question effectiveness rankings that make the
compression engine smarter over time. Facility-level dashboards that
give administrators the metrics they need to justify continued and
expanded adoption.

This is where WAiK becomes a data-wielding company, not just a
data ingestion tool.

---

## Subtask Index

| Task   | What It Builds                                        | Est. Time |
|--------|------------------------------------------------------|-----------|
| IR-3a  | Analytics aggregation endpoints                      | 3-4 hrs   |
| IR-3b  | Weekly intelligence report auto-generation           | 3-4 hrs   |
| IR-3c  | Question effectiveness tracking                      | 2-3 hrs   |
| IR-3d  | Staff improvement trajectory                         | 2-3 hrs   |
| IR-3e  | Old route cleanup + migration verification           | 1-2 hrs   |
| IR-3f  | Complete integration test (full system)               | 2 hrs     |

---

## New Files Created

```
app/api/admin/analytics/overview/route.ts      — facility metrics dashboard data
app/api/admin/analytics/staff/route.ts         — per-staff performance data
app/api/admin/analytics/trends/route.ts        — time-series trend data
app/api/cron/weekly-report/route.ts            — weekly intelligence cron
lib/agents/weekly-report-generator.ts          — weekly report LLM synthesis
lib/analytics/question-effectiveness.ts        — question ranking engine
lib/analytics/staff-trajectory.ts              — staff improvement tracker
```

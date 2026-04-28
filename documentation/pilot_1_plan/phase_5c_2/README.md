# Phase 5c-2 — Admin/DON Executive View (Trends)
## Epic Overview

---

## Goal

Deliver the **Executive View** for Admin/DON: a calm, trustworthy trends surface that answers:
- Is safety/compliance improving or degrading?
- Where are patterns emerging (unit/shift/type)?
- What are leading indicators of future exposure?
- What changed, and what should we do about it?

This view must **match the staff dashboard visual DNA** and feel like the same product as Daily Command — not an external BI tool.

---

## Executive View Principles

- **Signal over volume**: show a small set of trend cards; drill down for details.
- **Explainable insights**: every insight must cite evidence (links/IDs).
- **Leading indicators > lagging metrics**: prevent tomorrow’s exposure, not just summarize yesterday.
- **No chart zoo**: compact visuals (sparklines, small bars) + clear deltas.

---

## Navigation

Executive View is reached via the same header toggle:
- `Today` (Daily Command)
- `Trends` (Executive View)

Trends shares:
- facility selector context
- date range control: **7d / 30d / 90d**
- deep links into existing lists/queues

---

## Card Set + Ordering (Locked)

This ordering is the default for `/admin/dashboard?view=trends`.

### Zone 1 — Trends Header
- **E1. Trends Header**
  - date range (7d/30d/90d)
  - “Compared to previous period” delta language
  - quick jump chips (Incidents, Compliance, Risk, Staffing)

### Zone 2 — Executive Summary (hero)
- **E2. Facility Health Summary**
  - 3–5 KPI tiles max (trend + delta):
    - Incidents / 1,000 resident-days (or raw count if census unavailable)
    - Repeat incidents rate
    - Documentation completion rate
    - Time-to-signoff (median)
    - Protection days (days in Protected vs At risk/Exposed)

### Zone 3 — Trend Modules (stack)
- **E3. Incident Trends**
  - type trends + severity mix (compact)

- **E4. Compliance Drift**
  - completion over time + “where it’s slipping” (unit/role)

- **E5. Pattern & Cluster Insights (Evidence-backed)**
  - shift/unit/time clustering
  - “what changed” bullets with citations

- **E6. High-risk Cohort Trends**
  - count of high-risk residents over time + top drivers changing

- **E7. Intervention Effectiveness (lightweight)**
  - “what we tried” → “did it help?” (before/after snapshots, not complex causal claims)

- **E8. Staffing / Throughput Trends (support lens)**
  - backlog trend + bottleneck reasons + unit strain trend

### Sidebar (desktop)
- **S1. Weekly Brief (Trends narrative)**
  - “What changed” + “what to do next” with citations

---

## Responsive Ordering Rules

### Mobile (single column)
1. E1 Trends Header
2. E2 Facility Health Summary
3. E3 Incident Trends
4. E4 Compliance Drift
5. E5 Pattern & Cluster Insights
6. E6 High-risk Cohort Trends
7. E7 Intervention Effectiveness
8. E8 Staffing / Throughput Trends
9. S1 Weekly Brief (as bottom card or “View brief” action)

### Desktop (two-column)
- Main column: E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8
- Sidebar: S1 (sticky)

---

## Subtask Index (Granular)

Companion files live in this folder. Completed work uses `*-done.md`.

| Task   | What It Builds                                                     | Est. Time |
|--------|---------------------------------------------------------------------|-----------|
| 5c2-01 | Trends layout rails + date range control + toggle wiring            | 2–3 hrs   |
| 5c2-02 | E1 Trends Header (range, deltas, jump chips)                        | 2–3 hrs   |
| 5c2-03 | E2 Facility Health Summary (KPIs + deltas + definitions)            | 3–5 hrs   |
| 5c2-04 | E3 Incident Trends card (type + severity mix)                       | 3–5 hrs   |
| 5c2-05 | E4 Compliance Drift card (unit/role slip detection)                 | 3–6 hrs   |
| 5c2-06 | E5 Pattern & Cluster Insights (evidence-backed insights module)     | 4–7 hrs   |
| 5c2-07 | E6 High-risk Cohort Trends (drivers changing over time)             | 3–6 hrs   |
| 5c2-08 | E7 Intervention Effectiveness (before/after snapshots)              | 3–6 hrs   |
| 5c2-09 | E8 Staffing/Throughput Trends (support lens, not surveillance)      | 3–6 hrs   |
| 5c2-10 | Weekly Brief (Trends narrative) + citations                          | 2–4 hrs   |
| 5c2-11 | Data contracts + endpoints for Trends (API plan)                    | 4–8 hrs   |
| 5c2-12 | Loading/empty/error states + performance guardrails                 | 2–4 hrs   |
| 5c2-13 | QA: responsive ordering + parity + drilldown links                  | 2–3 hrs   |


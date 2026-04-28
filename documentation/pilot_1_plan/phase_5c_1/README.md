# Phase 5c-1 — Admin/DON Daily Command (Today View)
## Epic Overview

---

## Goal

Deliver a **Daily Command** admin dashboard that:
- **looks and feels like the staff dashboard** (Phase 5b design DNA)
- is **action-first** (risk closure + compliance flow), not analytics-heavy
- is **calm, scannable, and trustworthy**

Daily Command is the default landing for `/admin/dashboard` in the Admin experience.

---

## Card Set + Ordering (Locked)

**Main column (top → bottom)**
- A1 Command Header (facility context + chips + shortcuts)
- A2 Highest risk right now (hero)
- A3 Needs Attention (Today queue)
- A4 Documentation Health
- A5 Incident Pulse (Today)
- A6 High-risk Residents (Top 5)
- A7 Staff Support & Throughput (outliers only)

**Sidebar (desktop)**
- S1 Daily Brief (structured + cited)
- S2 Stats Sidebar (existing; restyled for parity)

**Mobile**
- single column, same order; brief becomes a bottom card or “View brief” action

---

## Non-Negotiables (Design + UX)

- **Match staff dashboard UI grammar**: rounding, borders, gradients, chip styling, badge counts.
- **One primary CTA per card** (avoid multi-CTA ambiguity).
- **No “BI dashboard” density**: prefer compact counts + small trends.
- **AI insights must cite evidence** (link to the incident(s)/note(s) they reference).

---

## Subtask Index (Granular)

Companion files live in this folder. Completed work uses `*-done.md`.

| Task   | What It Builds                                                     | Est. Time |
|--------|---------------------------------------------------------------------|-----------|
| 5c1-01 | Daily Command layout + Today/Trends header toggle (Today wired)     | 2–3 hrs   |
| 5c1-02 | A1 Command Header card (chips, facility context, shortcuts)         | 2–3 hrs   |
| 5c1-03 | A2 Highest risk right now (hero) + ranking + “View all”             | 3–5 hrs   |
| 5c1-04 | A3 Needs Attention (Today queue card) + deep links                  | 3–5 hrs   |
| 5c1-05 | A4 Documentation Health card (today)                                | 3–5 hrs   |
| 5c1-06 | A5 Incident Pulse (today) card + repeat indicator                   | 2–4 hrs   |
| 5c1-07 | A6 High-risk Residents card (top 5) + “why now” pills               | 3–5 hrs   |
| 5c1-08 | A7 Staff Support & Throughput card (outliers only)                  | 3–5 hrs   |
| 5c1-09 | Sidebar integration: Daily Brief + Stats parity pass                | 2–4 hrs   |
| 5c1-10 | Data contracts + endpoints needed for Today cards (API plan)        | 3–6 hrs   |
| 5c1-11 | Loading/empty/error states (calm, informative, non-blocking)        | 2–4 hrs   |
| 5c1-12 | QA sweep: scroll chain, responsive ordering, visual parity w/ staff | 2–3 hrs   |


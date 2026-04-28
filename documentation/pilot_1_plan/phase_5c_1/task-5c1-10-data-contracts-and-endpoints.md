# Task 5c1-10 — Data Contracts + Endpoints for Daily Command (API Plan)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 3–6 hours
## Depends On: existing admin APIs (`/api/incidents`, `/api/admin/dashboard-stats`, etc.)

---

## Why This Task Exists

Daily Command cards should not each invent their own fetch pattern. We need a small set of stable endpoints/types that:
- provide **today-scoped** aggregates
- support **deep links** into existing queues/lists
- keep AI/inference optional and evidence-linked

This task defines the contract, adds endpoints if missing, and centralizes types.

---

## Data Surfaces Needed (v1)

### 1) Daily Command Snapshot (single payload)
Provides all counts needed for A1 chips and lightweight card bodies:
- critical open count
- overdue docs count
- incidents today count
- protection state + top drivers (explainable)
- unit completion breakdown (compact)
- repeats within 7 days count

### 2) Highest Risk Items (top N, N=3 for hero)
- ranked list for A2 with:
  - label, whyNow, age, severity
  - owner/assignee info if applicable
  - deep link targets + CTA metadata

### 3) Needs Attention Queue Slice (top N)
- grouped by blocker reason with deep links

### 4) High-risk Residents (top 5)
- resident rows with drivers and deep links

### 5) Staff throughput outliers (top 3)
- blocked-by reasons + suggested next step

---

## Guardrails

- Avoid returning entire incident lists inside the dashboard payload.
- Prefer IDs + counts + short summaries + deep links.
- If any LLM-generated insight is included:
  - it must contain **citations** (IDs/links to source items)

---

## Success Criteria

- [ ] Types exist in `lib/types/…` for the new payloads.
- [ ] Cards can render from a small, stable set of endpoints.
- [ ] Deep link parameters are consistent across cards.


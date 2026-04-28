# Executive View (Trends) — Drilldown Destinations Map
## Phase: 5c-2 — Admin/DON Executive View (Trends)

This file defines **where every KPI/card drills down** so implementation agents don’t invent inconsistent URLs.

---

## Global rules (must follow)

- **Preserve admin context**: every link must keep `facilityId` (and `organizationId` if present) via `buildAdminPathWithContext()` or equivalent.
- **Prefer existing pages**:
  - Incidents list: `/admin/incidents`
  - Incident detail: `/admin/incidents/[id]`
  - Residents list: `/admin/residents`
  - Resident detail: `/admin/residents/[id]` or shared `/residents/[id]` if that’s the canonical route
  - Intelligence: `/admin/intelligence` (use when the drilldown is inherently narrative/exploratory)
  - Activity log: `/admin/settings/activity`
- **No dead-end drilldowns**: if a dedicated filtered view doesn’t exist yet, link to the closest list page + open the relevant filters pre-set (or link to Intelligence with a suggested question).
- **Query params should be stable**: define them here and reuse everywhere.

---

## Standard query params (proposed)

These params are used to create consistent filtered drilldowns. Where a page doesn’t support them yet, treat as “planned” and add support during implementation.

- `range`: `7d | 30d | 90d` (Trends selection)
- `from`, `to`: ISO date strings (optional; allows exact evidence windows)
- `type`: incident type filter (falls/skin/medication/behavior/etc)
- `severity`: `critical | warning | normal` (if available)
- `phase`: incident phase filter (existing system phases)
- `unit`: facility unit/wing (if available)
- `repeat=1`: repeating residents/incidents cohort filter (definition: repeat within 7d)
- `driver`: risk driver key (e.g., `repeat_falls`, `anticoagulant_fall`, `behavior_escalation`)
- `bottleneck`: throughput/compliance blocker reason (e.g., `missing_followup_note`)

Note: `/admin/incidents` currently uses `useResidentIncidentFilters` in-page, but does not yet parse these params into initial filter state. That enablement is part of phase work.

---

## E1 — Trends Header

- **Jump chips (Incidents/Compliance/Patterns/Risk/Staffing)**:
  - **Destination**: same page, scroll to anchors.
  - **Fallback**: none.

---

## E2 — Facility Health Summary (KPI tiles)

### KPI: Incidents (count or rate)
- **Primary drilldown**: `/admin/incidents?range=<range>`
- **Optional filters**:
  - if user clicks a mini “type” breakdown in the tile: add `type=<type>`

### KPI: Repeat incidents rate
- **Primary drilldown**: `/admin/incidents?range=<range>&repeat=1`
- **Alternative drilldown**: `/admin/intelligence` with suggested question:
  - “List repeating incidents/residents in the last <range> for this community.”

### KPI: Documentation completion
- **Primary drilldown**: `/admin/incidents?range=<range>` (and sort/filters for low completeness when supported)
- **Alternative drilldown**: `/admin/intelligence` suggested question:
  - “List recent reports with the lowest documentation completeness.”

### KPI: Median time-to-signoff
- **Primary drilldown**: `/admin/incidents?range=<range>&phase=phase_1_complete,phase_2_in_progress` (or the closest “awaiting signoff” cohort once defined)
- **Alternative**: `/admin/settings/activity?range=<range>` (if signoff events are logged and can be filtered)

### KPI: Protection days distribution
- **Primary drilldown**: stays on Trends; expands an “Exposure drivers” disclosure
- **Alternative**: `/admin/intelligence` suggested question:
  - “Summarize what drove At risk/Exposed days in the last <range>.”

---

## E3 — Incident Trends

### Clicking a type trend (e.g., Falls)
- **Drilldown**: `/admin/incidents?range=<range>&type=fall`

### Clicking severity mix (e.g., Critical)
- **Drilldown**: `/admin/incidents?range=<range>&severity=critical`

### Largest mover callout
- **Drilldown**: `/admin/incidents?range=<range>&type=<moverType>`

---

## E4 — Compliance Drift

### Clicking unit breakdown (e.g., Memory Care)
- **Drilldown**: `/admin/incidents?range=<range>&unit=<unit>`
- **Alternative** (if unit not supported): `/admin/intelligence` suggested question:
  - “Show documentation completion by unit over the last <range>.”

### Clicking role breakdown (e.g., RN)
- **Drilldown**: `/admin/incidents?range=<range>&role=rn` (planned)
- **Alternative**: `/admin/settings/activity?range=<range>&action=<doc_related_action>` (if available)

### Biggest slip callout
- **Drilldown**: `/admin/incidents?range=<range>&unit=<slipUnit>`

---

## E5 — Pattern & Cluster Insights

Every insight MUST include “View evidence”.

### View evidence
- **Drilldown**: `/admin/incidents?from=<from>&to=<to>&unit=<unit>&type=<type>`
- If the insight is repeat-based: add `repeat=1`
- If the insight is shift window-based: add `shift=<shiftKey>` (planned; fallback is date-time window via from/to)

---

## E6 — High-risk Cohort Trends

### “View cohort”
- **Primary drilldown**: `/admin/residents?range=<range>&risk=high` (planned)
- **Fallback**: `/admin/intelligence` suggested question:
  - “List high-risk residents this period and why they’re flagged.”

### Clicking a driver (top 3)
- **Primary drilldown**: `/admin/residents?range=<range>&driver=<driverKey>` (planned)
- **Fallback**: `/admin/intelligence` suggested question:
  - “List residents flagged for <driver> in the last <range> with supporting evidence.”

---

## E7 — Intervention Effectiveness

### “View evidence”
- **Drilldown**: `/admin/incidents?from=<beforeFrom>&to=<beforeTo>&type=<type>&unit=<unit>` (Before)
- and `/admin/incidents?from=<afterFrom>&to=<afterTo>&type=<type>&unit=<unit>` (After)

If UI can only link one place, link to:
- `/admin/intelligence` with a prefilled comparison question:
  - “Compare <metric> before vs after <intervention> for <unit>.”

---

## E8 — Staffing / Throughput Trends

### Clicking a bottleneck reason
- **Drilldown**: `/admin/incidents?range=<range>&bottleneck=<reasonKey>` (planned)
- **Fallback**: `/admin/intelligence` suggested question:
  - “What are the top documentation bottlenecks in the last <range>?”

### Clicking unit strain
- **Drilldown**: `/admin/incidents?range=<range>&unit=<unit>`
- **Alternative**: `/admin/settings/activity?range=<range>` filtered by unit (planned)

---

## Sidebar — Weekly Brief

Every bullet should link to:
- a filtered incidents list (`/admin/incidents?...`)
- or Intelligence with a suggested question when the drilldown is inherently narrative


# Daily Command (Today) — Drilldown Destinations Map
## Phase: 5c-1 — Admin/DON Daily Command

This file defines **where every Daily Command chip/card drills down** so implementation agents don’t invent inconsistent URLs.

---

## Global rules (must follow)

- **Preserve admin context** (`facilityId`, `organizationId`) on every link using `buildAdminPathWithContext()` (or equivalent).
- Prefer existing pages first:
  - Incidents list: `/admin/incidents`
  - Incident detail: `/admin/incidents/[id]`
  - Incident signoff: `/admin/incidents/[id]/signoff`
  - Residents list: `/admin/residents`
  - Resident detail: `/admin/residents/[id]` (or shared `/residents/[id]` if that’s the canonical route)
  - Intelligence: `/admin/intelligence`
  - Activity log: `/admin/settings/activity`
- If a dedicated drilldown does not exist yet, link to the closest list surface + pre-applied filters, or fall back to Intelligence with a suggested query.

---

## Standard query params (shared vocabulary)

These are the stable params that Daily Command should generate for filtered drilldowns.
If a destination page does not parse them yet, treat as “planned” and add parsing support during implementation.

- `range`: `today` (for Daily Command) or explicit `from`/`to`
- `from`, `to`: ISO date strings (optional; evidence windows)
- `type`: incident type filter
- `severity`: `critical | warning | normal` (if available)
- `phase`: incident phase filter (`phase_1_in_progress`, `phase_1_complete`, `phase_2_in_progress`, `closed`)
- `unit`: unit/wing (if available)
- `repeat=1`: repeat within 7 days cohort filter
- `bottleneck`: blocker reason key (e.g., `missing_followup_note`, `missing_witness_statement`)
- `attention=1`: “needs attention” cohort (planned)

---

## A1 — Command Header (chips + shortcuts)

### Chip: Critical open
- **Drilldown**: `/admin/incidents?range=today&severity=critical`
- **Fallback**: `/admin/incidents` (admin can filter manually)

### Chip: Overdue docs
- **Drilldown**: `/admin/incidents?range=today&bottleneck=overdue_docs`
- **Fallback**: `/admin/intelligence` suggested question:
  - “List incidents with overdue documentation today.”

### Chip: Incidents today
- **Drilldown**: `/admin/incidents?range=today`

### Chip: Protection state
- If **Protected**: expand an inline disclosure (no drilldown required)
- If **At risk / Exposed**:
  - **Drilldown**: `/admin/incidents?range=today&attention=1`
  - **Fallback**: `/admin/intelligence` suggested question:
    - “What is driving exposure risk today? Provide a short list with evidence.”

### Shortcut chips (Criticals / Docs / Incidents / Risk / Staff)
- **Primary**: scroll to anchors within Today view
- **Secondary**: if user long-presses or clicks “View all”, route to the list pages below

---

## A2 — Highest Risk Right Now (hero)

Each hero row must include a single CTA and a “View all” link when >3 exist.

### CTA: Assign / Nudge / Open bundle
- **Open incident detail**: `/admin/incidents/[id]`
- **Signoff** (if row is “ready to sign”): `/admin/incidents/[id]/signoff`
- **If risk is resident-driven**: `/admin/residents/[id]` (or shared `/residents/[id]`)

### “View all”
- **Drilldown**: `/admin/incidents?range=today&attention=1`

---

## A3 — Needs Attention (today queue card)

### “View queue”
- **Drilldown**: `/admin/incidents?range=today&attention=1`

### Group: Missing info
- **Drilldown**: `/admin/incidents?range=today&bottleneck=missing_info`

### Group: Awaiting follow-up
- **Drilldown**: `/admin/incidents?range=today&bottleneck=awaiting_followup`

### Group: Ready for sign-off
- **Drilldown**: `/admin/incidents?range=today&bottleneck=ready_for_signoff`

### Row click
- **Drilldown**: `/admin/incidents/[id]`

---

## A4 — Documentation Health (today)

### Oldest overdue item “Open”
- **Drilldown**: `/admin/incidents/[id]`

### Unit breakdown click
- **Drilldown**: `/admin/incidents?range=today&unit=<unit>`
- **Fallback**: `/admin/intelligence` suggested question:
  - “Show documentation gaps today by unit.”

---

## A5 — Incident Pulse (today)

### Type click (e.g., Falls)
- **Drilldown**: `/admin/incidents?range=today&type=<type>`

### Severity click (Critical/Warning)
- **Drilldown**: `/admin/incidents?range=today&severity=<severity>`

### Repeats within 7 days
- **Drilldown**: `/admin/incidents?range=today&repeat=1`

---

## A6 — High-risk Residents (top 5)

### “Open risk bundle”
- **Primary drilldown**: `/admin/residents/[id]` (or shared `/residents/[id]`)
- **Fallback**: `/admin/intelligence` suggested question:
  - “Summarize why this resident is flagged high-risk with evidence.”

### “View cohort”
- **Planned drilldown**: `/admin/residents?risk=high`
- **Fallback**: `/admin/intelligence` suggested question:
  - “List high-risk residents today and why.”

---

## A7 — Staff Support & Throughput

### Bottleneck reason click
- **Drilldown**: `/admin/incidents?range=today&bottleneck=<reasonKey>`

### Unit strain click
- **Drilldown**: `/admin/incidents?range=today&unit=<unit>`

### “Message / Assign help” CTA
- **Primary destination**: existing messaging surface if/when available
- **Fallback**: `/admin/settings/activity` (for audit trail) + `/admin/settings/staff` (to find staff contacts)

---

## API — Daily Command Today (aggregate)

- **`GET /api/admin/daily-command/today`** (same auth + `facilityId` / `organizationId` resolution as `/api/incidents` and `/api/admin/dashboard-stats`).
- **Response**: `DailyCommandTodayPayload` (`schemaVersion: 1`) — see `lib/types/daily-command-today.ts` and builder `lib/admin/build-daily-command-today.ts`.
- **Incident scope**: open pipeline only (`phase_1_in_progress`, `phase_1_complete`, `phase_2_in_progress`), matching the dashboard’s primary incidents fetch.
- **Stats merge**: optional — reads cached `waik:stats:<facilityId>` when present so A1 protection matches the header when Redis has warmed `dashboard-stats`.
- **Deep links** in the payload are built with the same query vocabulary as this document; shared helpers live in `lib/admin/daily-command-drilldowns.ts`.


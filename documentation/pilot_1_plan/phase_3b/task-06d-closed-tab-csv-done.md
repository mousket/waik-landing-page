# Task 06d — Closed Tab + CSV Export
## Phase: 3b — Admin Dashboard
## Estimated Time: 1–2 hours
## Depends On: task-06c (Active tab complete)

---

## Why This Task Exists

The Closed tab is the historical record — investigations completed in the
last 30 days. It serves two purposes: giving the DON a sense of throughput
and quality ("how well did we close investigations this month?"), and
providing a lightweight export mechanism for external reporting.

**Design pattern: Client-side CSV generation.**
The export button generates a CSV file in the browser from the data
already loaded in the tab. No server round-trip, no new API endpoint,
no file storage. This is appropriate for the pilot scale — when a
facility has hundreds of closed incidents per month, a server-side
streaming export becomes necessary. For now, client-side is clean,
fast, and requires no infrastructure.

**Privacy enforcement on export:**
The default export uses room numbers only. If the administrator has
enabled "include resident names" in Settings, the export includes names.
That setting (from task-11) does not exist yet. For this task: default
to room numbers only, with a commented TODO for the settings integration.

**Infrastructure: `?days=30` filter.**
The Closed tab uses the `days` query parameter established in task-06a.
`GET /api/incidents?phase=closed&days=30`. The server filters on
`phaseTransitionTimestamps.phase2Locked >= 30 days ago`. This means the
days filter applies to when the investigation was *locked*, not when the
incident was *reported*. This is the correct business logic — the DON
wants to see investigations she closed recently, not incidents reported
recently.

---

## Context Files

- `app/admin/dashboard/page.tsx` — add Closed tab content
- `lib/utils/csv-export.ts` — CREATE THIS
- `lib/types/incident-summary.ts` — from task-06a

---

## CSV Column Definition

```
roomNumber, incidentType, completenessAtSignoff, phase1SignedAt,
phase2LockedAt, investigatorName, daysToClose
```

Where `daysToClose` = Math.ceil((phase2LockedAt - phase1SignedAt) / 86400000)

Privacy rule: `roomNumber` only. No resident name.

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Closed tab shows incidents where `phase === "closed"` from last 30 days
- [ ] Table columns: Room | Date | Score | Investigator | Days to Close
- [ ] INC-009 (93%, 3 days) and INC-010 (71%, 5 days) visible in seed data
- [ ] "Export CSV" button downloads a valid CSV file
- [ ] CSV contains correct columns with no residentName field
- [ ] CSV filename: `waik-closed-incidents-[YYYY-MM-DD].csv`
- [ ] daysToClose computed correctly (phase2LockedAt - phase1SignedAt in days)
- [ ] Count on Closed tab shows number of records visible
- [ ] Loading skeleton while fetching

---

## Test Cases

```
TEST 1 — Closed tab shows seed data
  Action: Load /admin/dashboard, click Closed tab
  Expected: INC-009 visible (Room 515, 93%, 3 days)
            INC-010 visible (Room 306, 71%, 5 days)
  Pass/Fail: ___

TEST 2 — Days to close computed correctly
  Action: Look at INC-009 in Closed tab
  Expected: "3 days" shown in Days to Close column
            (phase2LockedAt was 15 days ago, phase1SignedAt was 18 days ago)
  Pass/Fail: ___

TEST 3 — Export CSV downloads file
  Action: Click "Export CSV" button on Closed tab
  Expected: File downloads in browser
            Filename: waik-closed-incidents-[today's date].csv
  Pass/Fail: ___

TEST 4 — CSV has correct columns
  Action: Open downloaded CSV in text editor
  Expected: First row: roomNumber,incidentType,completenessAtSignoff,
            phase1SignedAt,phase2LockedAt,investigatorName,daysToClose
  Pass/Fail: ___

TEST 5 — CSV has no resident name
  Action: Search CSV content for "Chen", "Johnson", "Martinez", "Okafor", "Thompson"
  Expected: None of those names appear in the CSV
  Pass/Fail: ___

TEST 6 — CSV data row is correct
  Action: Find INC-009 row in CSV
  Expected: 515,fall,93,[phase1SignedAt ISO],[phase2LockedAt ISO],Dr. Sarah Kim,3
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the Closed tab on the
admin dashboard and the CSV export.

PART A — CREATE lib/utils/csv-export.ts

export function generateClosedIncidentsCsv(incidents: IncidentSummary[]): string {
  const headers = [
    "roomNumber",
    "incidentType",
    "completenessAtSignoff",
    "phase1SignedAt",
    "phase2LockedAt",
    "investigatorName",
    "daysToClose"
  ]
  
  const rows = incidents.map(inc => {
    const daysToClose = inc.phase1SignedAt && inc.phase2LockedAt
      ? Math.ceil(
          (new Date(inc.phase2LockedAt).getTime() - new Date(inc.phase1SignedAt).getTime())
          / (1000 * 60 * 60 * 24)
        )
      : ""
    
    return [
      inc.residentRoom,
      inc.incidentType,
      inc.completenessAtSignoff,
      inc.phase1SignedAt ?? "",
      inc.phase2LockedAt ?? "",
      inc.investigatorName ?? "",
      daysToClose
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
  })
  
  return [headers.join(","), ...rows].join("\n")
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

PART B — CLOSED TAB DATA

In app/admin/dashboard/page.tsx, add Closed tab section.

Fetch on mount (no polling needed — closed incidents don't change):
  GET /api/incidents?phase=closed&days=30

The ?days=30 filter was added in task-06a. It filters on
phaseTransitionTimestamps.phase2Locked >= 30 days ago.

PART C — CLOSED TABLE

Compact table (no cards on mobile for this tab — data is historical
reference, not urgent actions):

Columns: Room | Date | Score | Investigator | Days to Close

  Room: residentRoom in teal
  
  Date: Format phase2LockedAt as "Mar 28" or "Today" or "Yesterday"
    Use date-fns format(new Date(inc.phase2LockedAt), "MMM d")
  
  Score: completenessAtSignoff as "[X]%"
    Color: teal if ≥ 85, amber if 60–84, red if < 60
  
  Investigator: investigatorName or "—"
  
  Days to Close: computed as above
    Color: green if ≤ 3 days, amber if 4–7 days, red if > 7 days

"Export CSV" button: top right of the tab panel
  On click: generate CSV from currently loaded incidents,
            trigger download with filename waik-closed-incidents-[YYYY-MM-DD].csv
  
  const today = format(new Date(), "yyyy-MM-dd")
  const csv = generateClosedIncidentsCsv(closedIncidents)
  downloadCsv(csv, `waik-closed-incidents-${today}.csv`)

COUNT BADGE: total closed incidents in last 30 days (no badge — just count
displayed as subtitle: "X investigations closed in the last 30 days")

LOADING SKELETON: 3 skeleton rows while fetching.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/11-ADMIN-DASHBOARD.md` — Closed tab
- Document CSV export in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_3b/task-06d-DONE.md`

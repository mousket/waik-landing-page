# Task 36 — Staff printable report page + download button on incident detail
## Status: OPEN
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 2–3 hours
## Depends On: Task 35 (reportPdfUrl stored on incident)

---

## Why This Task Exists

The PDF URL is now stored on the incident (task 35), but staff have no way to access it. This task:

1. Adds a **"View Phase 1 report"** button to the staff incident detail page that links directly to the PDF URL.
2. Creates a **`/staff/incidents/[id]/report`** page as a fallback HTML view for incidents where the async PDF has not yet generated (or where PDF storage is not configured) — it renders the same clinical record in-browser and triggers `window.print()` for saving.

---

## What This Task Creates / Modifies

### New page: `app/staff/incidents/[id]/report/page.tsx`

A server-rendered page that:
- Loads the incident from MongoDB (server-side, using the existing `connectMongo` + `IncidentModel` pattern).
- Access control: `isIncidentReporter(incident, user)` — redirect to `/staff/incidents/[id]` if not the reporter.
- Phase guard: if `phase === "phase_1_in_progress"`, show a message "Your report is not yet complete. Submit your report to access the signed record."
- Renders the full Phase 1 clinical record as styled HTML (matching the `Phase1PdfTemplate` layout but using Tailwind classes):
  - Facility header
  - Incident metadata (type, date, ID)
  - Resident name, room
  - Reporter name, role, sign-off date
  - Original narrative and enhanced clinical record
  - All answered Q&A (Tier 1, Tier 2, closing) in a clean table layout
  - Signature block: printed name, date, and signature image if present
- Print button at the top right: `onClick={() => window.print()}` — visible only on screen (`print:hidden`).
- Print stylesheet override via `<style media="print">` in the page head: hide the print button, use A4 page breaks, remove nav chrome.

**Important:** This page is separate from the PDF — it is the **fallback view**. If `incident.initialReport.signature.reportPdfUrl` is set, the download button on the detail page links directly to the PDF URL and this page is a secondary option. If the URL is not yet set, this page is the primary option.

### Modified: `components/staff/staff-incident-detail-view.tsx`

**In the "My Report" tab:**

Below the "Official clinical record" section, add a row:

```tsx
{incident.phase !== "phase_1_in_progress" && (
  <div className="flex gap-3 pt-2">
    {incident.initialReport?.signature?.reportPdfUrl ? (
      <a
        href={incident.initialReport.signature.reportPdfUrl}
        target="_blank"
        rel="noreferrer"
        className="..."  // match existing button style
      >
        <Download className="h-4 w-4 mr-2" />
        Download Phase 1 report (PDF)
      </a>
    ) : null}
    <Link href={`/staff/incidents/${incident.id}/report`}>
      <FileText className="h-4 w-4 mr-2" />
      View / print report
    </Link>
  </div>
)}
```

**In the desktop sidebar:**

Below the "Continue & submit" CTA (or in place of it once signed), add the same download row.

---

## Success Criteria

- [ ] `GET /staff/incidents/[id]/report` returns a 200 with the clinical HTML view for the incident reporter.
- [ ] The page redirects non-reporters to the incident detail page.
- [ ] The page shows an "in progress" message for `phase_1_in_progress` incidents.
- [ ] The print button triggers browser print; the print layout hides the button and nav.
- [ ] On the incident detail "My Report" tab, the download PDF button is visible when `reportPdfUrl` is set and `phase >= phase_1_complete`.
- [ ] The "View / print report" link is always visible for completed incidents, regardless of whether `reportPdfUrl` is set.
- [ ] `npm run typecheck` and `npm run build` pass.

---

## Test Cases (manual)

```
TEST 1 — Report page renders
  Given: incident is phase_1_complete; user is the reporter
  When:  /staff/incidents/{id}/report is loaded
  Then:  clinical record is visible with all answered Q&A, narrative, and signature block

TEST 2 — Access control
  Given: different authenticated user who is not the reporter
  When:  /staff/incidents/{id}/report is loaded
  Then:  redirect to /staff/incidents/{id}

TEST 3 — In-progress guard
  Given: incident is phase_1_in_progress
  When:  /staff/incidents/{id}/report is loaded (as reporter)
  Then:  "not yet complete" message shown; no Q&A rendered

TEST 4 — Print layout
  Given: report page is loaded
  When:  browser print dialog is opened (Cmd+P or print button)
  Then:  nav chrome, print button, and sidebar are hidden; content fills the page

TEST 5 — Download button on detail page
  Given: incident.initialReport.signature.reportPdfUrl is set
  When:  staff views the incident detail My Report tab
  Then:  "Download Phase 1 report (PDF)" link is visible and opens the PDF in a new tab

TEST 6 — View/print fallback
  Given: reportPdfUrl is null (PDF not yet generated)
  When:  staff views the incident detail My Report tab
  Then:  "View / print report" link is visible; PDF download link is not shown
```

---

## Implementation prompt

```
Phase 11 task 36: Staff printable report page + download button.

1. Create app/staff/incidents/[id]/report/page.tsx:
   - Server component; load incident with connectMongo + IncidentModel
   - Access control: isIncidentReporter check; redirect if not reporter
   - Phase guard: show message if phase_1_in_progress
   - Render the full Phase 1 clinical record in HTML using Tailwind classes:
     header, metadata, resident, reporter, narratives, Q&A tables, signature block
   - Print button (window.print()); print:hidden Tailwind class on nav/button
   - Match the visual style of StaffFlowFrame / CARD patterns from staff-incident-detail-view.tsx

2. Modify components/staff/staff-incident-detail-view.tsx:
   - In the My Report tab, after the clinical record section:
     - If reportPdfUrl is set: show "Download Phase 1 report (PDF)" as an anchor tag
     - Always show "View / print report" link to /staff/incidents/{id}/report
     - Visible only when phase !== "phase_1_in_progress"
   - In the desktop sidebar: add the same download row below the phase status
   - Import Download, FileText from lucide-react
```

---

## Files to create / modify

| File | Change |
|------|--------|
| `app/staff/incidents/[id]/report/page.tsx` | **New** — staff printable report page |
| `components/staff/staff-incident-detail-view.tsx` | Add download button + view/print link |

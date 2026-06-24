## Status: DONE — 2026-06-06
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 2–3 hours
## Depends On: Task 35 (reportPdfUrl stored on incident)

---

## Why This Task Exists

The PDF URL is stored on the incident (task 35) but staff have no way
to access it. This task adds a download button to the incident detail
page and creates a fallback HTML report view for when the PDF has not
yet generated.

---

## What This Task Creates / Modifies

### New page: `app/staff/incidents/[id]/report/page.tsx`

Server-rendered page that:
- Loads the incident from MongoDB (server-side)
- Access: `isIncidentReporter` — redirect if not the reporter
- Phase guard: if `phase_1_in_progress`, show "Your report is not yet
  complete. Submit your report to access the signed record."
- Renders the full Phase 1 clinical record as styled HTML (Tailwind):
  - Facility header, incident metadata, resident, reporter
  - Original narrative (blockquote)
  - Enhanced clinical record (labeled sections)
  - All answered Q&A in clean table layout
  - Signature block with drawn signature image
- Print button (top right): `onClick={() => window.print()}`
  with `print:hidden` Tailwind class
- Print CSS: hide nav, print button, sidebar; use A4 page breaks

### Modified: `components/staff/staff-incident-detail-view.tsx`

In the "My Report" tab, below the clinical record section:

```tsx
{incident.phase !== "phase_1_in_progress" && (
  <div className="flex gap-3 pt-2">
    {incident.initialReport?.signature?.reportPdfUrl && (
      <a href={incident.initialReport.signature.reportPdfUrl}
         target="_blank" rel="noreferrer"
         className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg ...">
        <Download className="h-4 w-4" />
        Download Phase 1 Report (PDF)
      </a>
    )}
    <Link href={`/staff/incidents/${incident.id}/report`}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg ...">
      <FileText className="h-4 w-4" />
      View / Print Report
    </Link>
  </div>
)}
```

Also display the signature in the My Report tab if present:
```tsx
{incident.initialReport?.signature?.signatureImage && (
  <div className="mt-4 pt-4 border-t">
    <p className="text-sm text-muted mb-2">Signed by {incident.initialReport.signature.signedByName}</p>
    <img src={incident.initialReport.signature.signatureImage}
         alt="Signature" className="h-12 opacity-80" />
    <p className="text-xs text-muted mt-1">
      {new Date(incident.initialReport.signature.signedAt).toLocaleString()}
    </p>
  </div>
)}
```

---

## Success Criteria

- [ ] `/staff/incidents/[id]/report` renders the clinical HTML view for the reporter
- [ ] Redirects non-reporters to incident detail page
- [ ] Shows "not yet complete" for phase_1_in_progress
- [ ] Print button triggers browser print; print layout hides nav/buttons
- [ ] Download PDF button visible when reportPdfUrl is set
- [ ] "View / print" link always visible for completed incidents
- [ ] Signature image displayed in My Report tab when present
- [ ] `npm run build` passes

---

## Implementation Prompt

```
Phase 11 task 36: Staff printable report page + download button.

1. Create app/staff/incidents/[id]/report/page.tsx:
   Server component. Load incident via connectMongo + IncidentModel.
   isIncidentReporter check. Phase guard. Render full Phase 1 record
   as styled HTML. Print button with print:hidden class.

2. Modify components/staff/staff-incident-detail-view.tsx:
   In My Report tab: add PDF download button (if reportPdfUrl set)
   and "View / print" link (always for completed incidents).
   Add signature image display with name, date, drawn image.
   Import Download, FileText from lucide-react.

3. npm run typecheck and npm run build.
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `app/staff/incidents/[id]/report/page.tsx` | **New** — printable report page |
| `components/staff/staff-incident-detail-view.tsx` | Download button + signature display |

---
---
---


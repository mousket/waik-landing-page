## Status: DONE — 2026-06-07
## Phase: 11e — Email Phase 1 report
## Estimated Time: 3–4 hours
## Depends On: tasks 51, 52

---

## Why This Task Exists

Nurses and admins need to **send the signed Phase 1 record** to an email address they choose (e.g. personal archive, DON inbox, compliance). Use the **existing Resend email system** — same stack as staff welcome emails.

---

## What This Task Creates / Modifies

1. **`emails/phase1-report.tsx`** — WAiK chrome React Email template with CTA + confidential footer
2. **`lib/send-phase1-report-email.ts`** — Resend send + optional PDF attachment via `renderPhase1PdfBuffer`
3. **`app/api/incidents/[id]/report/email/route.ts`** — POST with auth, validation, audit trail, 503 when unconfigured
4. **`components/staff/email-phase1-report-dialog.tsx`** — Dialog + toolbar button
5. **`components/staff/staff-print-report-toolbar.tsx`** — Email report button
6. **`components/staff/staff-incident-detail-view.tsx`** — Email report on My report tab
7. **`lib/report/generate-phase1-pdf.ts`** — Exported `renderPhase1PdfBuffer` for email attachment
8. **`backend/src/models/incident.model.ts`** — Audit action `phase1_report_emailed`

---

## Success Criteria

- [x] Reporter can email signed report to chosen address
- [x] Email uses WAiK-themed HTML (matches welcome emails)
- [x] PDF attached when checkbox on (or link works when off)
- [x] API returns clear error when Resend not configured
- [x] Audit trail records send event
- [x] `npm run build` passes

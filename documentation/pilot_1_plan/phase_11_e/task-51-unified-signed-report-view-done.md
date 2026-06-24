## Status: DONE — 2026-06-07
## Phase: 11e — Unified signed report view
## Estimated Time: 3–4 hours
## Depends On: task-50

---

## Why This Task Exists

`/staff/incidents/[id]/report` uses a basic print layout. The nurse signed a richer **clinical document** on the preview screen. Re-opening should show the **same structure**: insights → verbatim → clinical record → Q&A → signature.

---

## What This Task Creates / Modifies

1. **`components/staff/clinical-report-preview.tsx`**
   - `mode: "signoff" | "readonly"` — read-only hides edit pencils, signature canvas, submit bar; shows stored `signatureImage`

2. **`lib/report/phase1-signed-report-data.ts`** (**new**)
   - Maps `IncidentDocument` + `phase1SignoffSnapshot` → `PreviewResponse` shape (legacy fallback via `enhancedNarrative`)

3. **`components/staff/phase1-signed-report-view.tsx`** (**new**)
   - Thin client wrapper around `ClinicalReportPreview` in readonly mode

4. **`app/staff/incidents/[id]/report/page.tsx`**
   - Replaced hand-rolled sections with unified component
   - Responsive widths: `max-w-full md:max-w-3xl lg:max-w-4xl xl:max-w-5xl`
   - Keeps `StaffPrintReportToolbar` (Print, Download PDF)

5. **`components/staff/staff-incident-detail-view.tsx`**
   - Subtitle under "View / Print Report": "Includes WAiK summary and your signature"

6. **`__tests__/phase1-signed-report-data.test.ts`**

---

## Success Criteria

- [x] Signed Helen report shows clinical summary + recommendations at top
- [x] Verbatim block matches `initialReport.narrative`
- [x] Signature image identical to sign-off moment
- [x] Print (`window.print`) renders full document
- [x] Mobile / tablet / desktop layouts fluid (match preview breakpoints)
- [x] `npm run build` passes

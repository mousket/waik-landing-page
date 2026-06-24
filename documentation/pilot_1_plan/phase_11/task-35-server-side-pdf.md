# Task 35 — Server-side PDF generation (Option B, `@react-pdf/renderer`)
## Status: OPEN
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 4–5 hours
## Depends On: Task 34 (signatureImage stored on incident)

---

## Why This Task Exists

After sign-off, the incident needs a **real, downloadable PDF file** — not a browser print dialog. Staff need to share the report by link, attach it to communications, and retrieve it later from the incident detail page. This task:

1. Installs `@react-pdf/renderer` (server-only; adds nothing to the client bundle).
2. Builds a `Phase1PdfTemplate` React component tree that renders the full Phase 1 clinical record.
3. Creates a Next.js API route (`/api/incidents/[id]/report/pdf`) that generates the PDF and either streams it as a response or stores it and returns the URL.
4. Triggers this route asynchronously from `app/api/report/complete/route.ts` after sign-off, storing the resulting URL on `incident.initialReport.signature.reportPdfUrl`.

---

## What This Task Creates / Modifies

### Install dependency

```bash
pnpm add @react-pdf/renderer
```

`@react-pdf/renderer` is a pure Node/server package. It must **not** be imported in any client component — import only inside API routes or server-side utilities marked `"use server"` or route handlers.

### New file: `components/staff/phase1-pdf-template.tsx`

A React component tree using `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet`). It receives a fully hydrated incident object and renders:

**Page layout**
- `Page` with A4 size, `fontFamily: "Helvetica"`, padding 40pt all sides.

**Header**
- Facility name (bold, large), "INCIDENT REPORT — PHASE 1 CLINICAL RECORD" subtitle.
- Right column: incident ID, incident date, report date.

**Divider line**

**Incident details block**
- Incident type, location, phase badge.
- Resident: name, room number, DOB.
- Reporter: name, role, sign-off date.

**Narrative section**
- "Original narrative (staff words)" — `initialReport.narrative`
- "Official clinical record" — `initialReport.enhancedNarrative` (formatted with section labels)

**Questions section**
- Tier 1 Q&A table (question | answer)
- Tier 2 Q&A table (answered questions only)
- Closing Q&A table

**Signature block**
- "This report was reviewed and signed by [name] on [date]."
- Declaration text.
- If `signatureImage` is present: render `<Image src={signatureImage} style={{ width: 200, height: 60 }} />`.
- Signer name printed below the image.

**Footer on each page**
- "WAiK — Confidential incident record" left, page number right.

### New route: `app/api/incidents/[id]/report/pdf/route.ts`

```
GET /api/incidents/[id]/report/pdf
```

- Auth: must be `isIncidentReporter(incident, user)` OR admin/phase2 role (matches existing access patterns).
- Loads the incident from MongoDB (`IncidentModel.findOne({ id, facilityId })`).
- Checks phase is `phase_1_complete` or later; returns 400 if not.
- Renders the PDF: `const pdfBuffer = await renderToBuffer(<Phase1PdfTemplate incident={incident} />)`.
- **Storage:** If `BLOB_STORAGE_URL` env var is set (Vercel Blob or similar), upload the buffer and return the URL. Otherwise, stream the buffer directly as a response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="incident-{id}-phase1.pdf"`.
- Returns `{ pdfUrl }` as JSON when stored, or streams the PDF bytes when not.

> **Note:** For the pilot, streaming directly is acceptable. Storage integration can be layered in without changing the API shape.

### Modified: `app/api/report/complete/route.ts`

After the existing `void generateAndStoreEmbedding(...).catch(...)` call, add:

```ts
// Async PDF generation — fires after sign-off; does not block the response
void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/incidents/${incidentId}/report/pdf`, {
  method: "POST",   // or call the generation function directly if same process
  headers: { "x-internal-token": process.env.INTERNAL_API_TOKEN ?? "" },
})
  .then(async (res) => {
    if (res.ok) {
      const { pdfUrl } = await res.json()
      if (pdfUrl) {
        await IncidentModel.updateOne(
          { id: incidentId },
          { $set: { "initialReport.signature.reportPdfUrl": pdfUrl } },
        )
      }
    }
  })
  .catch((err) => console.warn("[report/complete] PDF generation failed:", err))
```

Alternatively (preferred if same-process): extract a `generatePhase1Pdf(incidentId, facilityId)` async function in `lib/report/generate-phase1-pdf.ts` and call it the same way as `generateAndStoreEmbedding`.

---

## Success Criteria

- [ ] `pnpm add @react-pdf/renderer` added to `package.json`.
- [ ] `GET /api/incidents/[id]/report/pdf` returns a valid PDF (content-type `application/pdf`) for a completed incident.
- [ ] PDF contains: facility name, incident metadata, resident name, reporter name, all answered Q&A, narrative, and drawn signature image.
- [ ] PDF cannot be accessed by a user who is not the incident reporter or an admin.
- [ ] After sign-off, `incident.initialReport.signature.reportPdfUrl` is populated within a few seconds (async; no blocking the sign-off response).
- [ ] If PDF generation fails, it logs a warning but does **not** cause the sign-off API to return an error.
- [ ] `npm run typecheck` and `npm run build` pass (`@react-pdf/renderer` must not be referenced from any client component).

---

## Test Cases (manual)

```
TEST 1 — PDF generation via API
  Given: incident is phase_1_complete with a signatureImage set
  When:  GET /api/incidents/{id}/report/pdf is called (authenticated as reporter)
  Then:  response is application/pdf; PDF opens with correct content

TEST 2 — Async trigger after sign-off
  Given: staff submits sign-off
  When:  /api/report/complete returns 200
  Then:  within ~5 seconds, incident.initialReport.signature.reportPdfUrl is set in MongoDB

TEST 3 — Access control
  Given: a different authenticated user (not the reporter, not admin)
  When:  GET /api/incidents/{id}/report/pdf
  Then:  403 response

TEST 4 — Phase guard
  Given: incident is phase_1_in_progress (not yet signed off)
  When:  GET /api/incidents/{id}/report/pdf
  Then:  400 response with "report not yet finalized"

TEST 5 — PDF not in client bundle
  Given: npm run build completes
  Then:  @react-pdf/renderer does not appear in the client-side JS bundle
         (check .next/static/chunks/ — it should only appear in server chunks)
```

---

## Implementation prompt

```
Phase 11 task 35: Server-side PDF generation using @react-pdf/renderer.

1. pnpm add @react-pdf/renderer

2. Create components/staff/phase1-pdf-template.tsx using @react-pdf/renderer
   primitives (Document, Page, View, Text, Image, StyleSheet). It receives
   an incident document and renders: header (facility name, incident ID, dates),
   incident details (type, resident, reporter), narrative sections, all answered
   Q&A tables (Tier 1, Tier 2, closing), and a signature block with the
   signatureImage (base64 PNG) if present.

3. Create app/api/incidents/[id]/report/pdf/route.ts:
   - Auth: isIncidentReporter OR admin role
   - Load incident from MongoDB
   - Phase guard: must be phase_1_complete or later
   - const pdfBuffer = await renderToBuffer(<Phase1PdfTemplate incident={incident} />)
   - Stream as application/pdf response OR upload to blob storage and return { pdfUrl }

4. In app/api/report/complete/route.ts, after the generateAndStoreEmbedding call,
   fire an async background call to generate the PDF and store the URL:
   - Call generatePhase1Pdf(incidentId, facilityId) from lib/report/generate-phase1-pdf.ts
   - On success, set incident.initialReport.signature.reportPdfUrl in MongoDB
   - Catch errors with console.warn; never let PDF failure break the sign-off response

5. npm run typecheck and npm run build — verify @react-pdf/renderer is not in client chunks.
```

---

## Files to create / modify

| File | Change |
|------|--------|
| `components/staff/phase1-pdf-template.tsx` | **New** — `@react-pdf/renderer` component tree |
| `app/api/incidents/[id]/report/pdf/route.ts` | **New** — PDF generation + streaming/storage route |
| `lib/report/generate-phase1-pdf.ts` | **New** — helper to call generation + store URL |
| `app/api/report/complete/route.ts` | Fire async PDF generation after sign-off |
| `package.json` / `pnpm-lock.yaml` | Add `@react-pdf/renderer` |

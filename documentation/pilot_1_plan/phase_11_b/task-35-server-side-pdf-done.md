## Status: DONE — 2026-06-06
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 4–5 hours
## Depends On: Task 34 (signatureImage stored on incident)

---

## Why This Task Exists

After sign-off, the incident needs a real, downloadable PDF file — not
a browser print dialog. Staff need to share the report by link, attach
it to communications, and retrieve it later. This task:

1. Installs `@react-pdf/renderer` (server-only; adds nothing to client bundle).
2. Builds a `Phase1PdfTemplate` React component tree for the full Phase 1 record.
3. Creates a GET route that generates the PDF on demand (with caching).
4. Triggers this route asynchronously from sign-off, storing the URL.

**Key improvement over Cursor's version:** The GET route doubles as a
retry mechanism. If async generation failed at sign-off, clicking
"Download" from the incident detail page regenerates on demand.

---

## What This Task Creates / Modifies

### Install dependency

```bash
pnpm add @react-pdf/renderer
```

`@react-pdf/renderer` must NEVER be imported in any client component.
Import only inside API routes or files marked with `"use server"`.

### New file: `components/staff/phase1-pdf-template.tsx`

A React component tree using `@react-pdf/renderer` primitives:
`Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet`.

**Do NOT add "use client" to this file.** It runs server-side only.

Receives a fully hydrated incident object. Renders:

PAGE 1:
- Facility name (bold, 18pt), "INCIDENT REPORT — PHASE 1 CLINICAL RECORD"
- Incident ID, incident date, report date (right-aligned)
- Divider line (1pt, teal #0D7377)
- Incident type badge text, location
- Resident: name, room number
- Reporter: name, role, sign-off date
- Completeness score: "Documentation completeness: XX%"

NARRATIVE SECTIONS:
- "ORIGINAL NARRATIVE (Staff Words)" — initialReport.narrative in a
  gray-background box (#F5F5F5)
- "OFFICIAL CLINICAL RECORD" — initialReport.enhancedNarrative parsed
  into labeled sections (each with a bold section heading)

Q&A TABLES:
- "INITIAL QUESTIONS (TIER 1)" — table with Question | Answer columns
- "FOLLOW-UP QUESTIONS (TIER 2)" — same format, answered only
- "CLOSING QUESTIONS" — same format
- Table styling: alternating row backgrounds (#FFFFFF / #F9FAFB),
  header row in dark teal (#0A3D40) with white text

SIGNATURE BLOCK:
- "This report was reviewed and signed by [name] on [date]."
- Declaration text (8pt, muted)
- If signatureImage: `<Image src={signatureImage} style={{ width: 200, height: 60 }} />`
- Signer name printed below the image in bold

FOOTER (every page):
- Left: "WAiK — Confidential incident record"
- Right: page number (using `render` prop with `pageNumber` / `totalPages`)

### New route: `app/api/incidents/[id]/report/pdf/route.ts`

```
GET /api/incidents/[id]/report/pdf
```

Server behavior:
1. Auth: `getCurrentUser()`. Must be the incident reporter OR an admin-tier role.
   403 if neither.
2. Load incident from MongoDB: `IncidentModel.findOne({ id: params.id, facilityId })`.
   404 if not found.
3. Phase guard: phase must be `phase_1_complete` or later. If `phase_1_in_progress`:
   return 400 `{ error: "Report not yet finalized. Complete sign-off first." }`
4. **Cache check:** If `incident.initialReport.signature.reportPdfUrl` is set AND
   the URL is a valid stored blob URL, redirect to it (302). This prevents
   regeneration on every click.
5. **Generate:** `const pdfBuffer = await renderToBuffer(<Phase1PdfTemplate incident={incident} />)`
6. **Storage decision:**
   - If `BLOB_STORAGE_URL` env var is set: upload buffer to blob storage,
     store URL on incident, return `{ pdfUrl }` as JSON.
   - If not set (pilot): stream the buffer directly as response with
     `Content-Type: application/pdf` and `Content-Disposition: attachment`.
7. **On-demand retry:** If `reportPdfUrl` was null (async generation failed at
   sign-off), this GET call generates the PDF and stores the URL. The download
   button becomes the retry mechanism.

### New helper: `lib/report/generate-phase1-pdf.ts`

```ts
export async function generatePhase1Pdf(
  incidentId: string,
  facilityId: string
): Promise<string | null>
```

This helper:
1. Loads the incident from MongoDB
2. Renders the PDF using Phase1PdfTemplate
3. If blob storage: uploads and returns URL
4. If no blob storage: returns null (PDF will be streamed on demand)
5. Stores the URL on `incident.initialReport.signature.reportPdfUrl`
6. Wrapped in try/catch — never throws

### Modified: `app/api/report/complete/route.ts`

After the existing `void generateAndStoreEmbedding(...)` call, add:

```ts
// Async PDF generation — fires after sign-off; does not block the response
void generatePhase1Pdf(session.incidentId, session.facilityId)
  .catch(err => console.warn("[report/complete] PDF generation failed:", err))
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `@react-pdf/renderer` does NOT appear in client-side JS bundle
- [ ] GET `/api/incidents/{id}/report/pdf` returns `application/pdf` for completed incidents
- [ ] PDF contains: facility name, incident metadata, resident, reporter, all Q&A,
      narrative sections, and drawn signature image
- [ ] PDF cannot be accessed by non-reporter non-admin users (403)
- [ ] Phase guard: 400 for `phase_1_in_progress` incidents
- [ ] After sign-off, `reportPdfUrl` is populated within ~5 seconds (async)
- [ ] If async PDF fails, clicking "Download" from detail page generates on demand
- [ ] If `reportPdfUrl` already set, GET route returns cached version (no regeneration)

---

## Test Cases

```
TEST 1 — PDF generates via GET
  Given: incident is phase_1_complete with signatureImage set
  When: GET /api/incidents/{id}/report/pdf (as reporter)
  Then: response is application/pdf; PDF opens with correct content
  Pass/Fail: ___

TEST 2 — Async trigger after sign-off
  Given: staff submits sign-off
  When: /api/report/complete returns 200
  Then: within ~5s, incident.initialReport.signature.reportPdfUrl is set
  Pass/Fail: ___

TEST 3 — On-demand retry
  Given: reportPdfUrl is null (async generation failed)
  When: GET /api/incidents/{id}/report/pdf
  Then: PDF generates on demand; reportPdfUrl is set after response
  Pass/Fail: ___

TEST 4 — Cache hit
  Given: reportPdfUrl is already set to a valid URL
  When: GET /api/incidents/{id}/report/pdf
  Then: redirects to cached URL (no regeneration)
  Pass/Fail: ___

TEST 5 — Access control
  Given: different user (not reporter, not admin)
  When: GET /api/incidents/{id}/report/pdf
  Then: 403
  Pass/Fail: ___

TEST 6 — Phase guard
  Given: incident is phase_1_in_progress
  When: GET /api/incidents/{id}/report/pdf
  Then: 400 "Report not yet finalized"
  Pass/Fail: ___

TEST 7 — Not in client bundle
  Given: npm run build completes
  Then: @react-pdf/renderer does not appear in .next/static/chunks/
  Pass/Fail: ___
```

---

## Implementation Prompt

```
Phase 11 task 35: Server-side PDF generation using @react-pdf/renderer.

1. pnpm add @react-pdf/renderer

2. Create components/staff/phase1-pdf-template.tsx — DO NOT add "use client".
   Use @react-pdf/renderer primitives (Document, Page, View, Text, Image,
   StyleSheet). Receives incident object. Renders:
   - Header: facility name, incident ID, dates
   - Incident details: type, resident, reporter, completeness
   - Original narrative in gray box
   - Official clinical record with section headings
   - Q&A tables (Tier 1, Tier 2, closing) with alternating row backgrounds
   - Signature block with signatureImage if present
   - Footer: "WAiK — Confidential" + page number on every page

3. Create app/api/incidents/[id]/report/pdf/route.ts (GET):
   - Auth: isIncidentReporter OR admin role
   - Phase guard: must be phase_1_complete or later
   - CACHE CHECK: if reportPdfUrl is set, redirect 302 to it
   - Generate: renderToBuffer(<Phase1PdfTemplate incident={incident} />)
   - Stream as application/pdf OR upload to blob and return { pdfUrl }
   - ON-DEMAND RETRY: if reportPdfUrl was null, store URL after generation

4. Create lib/report/generate-phase1-pdf.ts:
   - Load incident, render PDF, upload if blob storage available, store URL
   - Wrapped in try/catch; never throws

5. Modify app/api/report/complete/route.ts:
   - After generateAndStoreEmbedding call, add:
     void generatePhase1Pdf(incidentId, facilityId).catch(console.warn)

6. npm run typecheck and npm run build.
   Verify @react-pdf/renderer is NOT in any client chunk.
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `components/staff/phase1-pdf-template.tsx` | **New** — PDF template (server-only) |
| `app/api/incidents/[id]/report/pdf/route.ts` | **New** — PDF generation + caching route |
| `lib/report/generate-phase1-pdf.ts` | **New** — async generation helper |
| `app/api/report/complete/route.ts` | Fire async PDF generation after sign-off |
| `package.json` | Add @react-pdf/renderer |

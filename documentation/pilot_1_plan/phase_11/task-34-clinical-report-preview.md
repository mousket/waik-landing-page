# Task 34 — Clinical report preview screen + handwriting signature canvas
## Status: OPEN
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 4–6 hours
## Depends On: Phase 10 complete (report session persistence, Tier 2 quality)

---

## Why This Task Exists

Right now, clicking "Sign and submit report" in the staff incident report flow fires a single API call with a **hardcoded** declaration string — the staff member never sees their completed report before signing it. There is no signature input of any kind. This task inserts a **`clinical_preview`** step between the `closing` phase and the `signoff` phase so that staff:

1. Read through their full formatted incident record (a DocuSign-style document view).
2. Draw their handwriting signature on an HTML5 canvas at the bottom.
3. Continue to the existing `signoff` step, which now carries the captured signature image.

The signature image (base64 PNG) is passed to `/api/report/complete` and stored on `incident.initialReport.signature.signatureImage` for later inclusion in the PDF (task 35).

---

## What This Task Creates / Modifies

### New component: `components/staff/clinical-report-preview.tsx`

A full-screen `StaffFlowFrame`-wrapped component that renders:

**Header section**
- Facility name and logo (from session or incident metadata)
- "INCIDENT REPORT — PHASE 1" heading with incident type badge
- Incident ID, incident date, report date, reporter name and role

**Resident section**
- Resident full name, room number, DOB (from `session.residentName` / incident metadata)

**Narrative section**
- "Your original narrative" (verbatim from `session.fullNarrative`)
- "Official clinical record" (AI-enhanced narrative from `session.initialReport.enhancedNarrative` if already built, or a note that it will be generated on submission)

**Questions section**
- Tier 1 questions and answers, grouped by label
- Tier 2 questions and answers (answered only), grouped by label
- Closing questions and answers

**Signature section**
- "By signing below, I confirm that this report accurately reflects my observations and actions."
- Signer name (auto-filled, read-only)
- Date and time (auto-filled, read-only)
- HTML5 `<canvas>` drawing area for handwriting signature
- "Clear" button to reset the canvas
- "Review complete — continue to sign off" button (disabled until a stroke has been drawn)

**Implementation notes for the signature canvas:**
- Use `react-signature-canvas` package (`npm install react-signature-canvas @types/react-signature-canvas`).
- Ref to the SignatureCanvas component; call `sigCanvas.current.getTrimmedCanvas().toDataURL("image/png")` to extract the base64 image when the user taps "continue".
- On mobile, the canvas must fill the full available width; use `canvasProps={{ className: "w-full", style: { height: 120 } }}`.

### Modified: `app/staff/report/page.tsx`

- Add `"clinical_preview"` to the `ReportPhase` union type.
- After the user completes the `closing` phase (existing `closing_complete` handler that sets phase to `signoff`), set phase to `"clinical_preview"` instead.
- Add a `clinical_preview` render case that shows `<ClinicalReportPreview>` and passes:
  - `session` (the current `ReportSession` state — already available in page state)
  - `onContinue={(signatureImage: string) => { setSignatureImage(signatureImage); setPhase("signoff") }}`
- Add a `signatureImage` state variable (`useState<string | null>(null)`).
- Pass `signatureImage` into the `handleSignOff` body alongside the existing `signature` object.

### Modified: `app/api/report/complete/route.ts`

- Accept `signatureImage?: string` in the request body.
- When present, include it in the `initialReport.signature` update:
  ```ts
  "initialReport.signature.signatureImage": body.signatureImage ?? null,
  ```
- No other changes; PDF generation happens asynchronously in task 35.

### Modified: `backend/src/models/incident.model.ts`

Add to `SignatureSchema`:
```ts
signatureImage: { type: String, default: null },   // base64 PNG from canvas
reportPdfUrl:  { type: String, default: null },    // populated by task 35
```

---

## Success Criteria

- [ ] After the last closing question, the report flow shows the clinical preview screen, **not** the sign-off card.
- [ ] The preview displays: facility name, incident type, resident name, narrative, all answered questions, and the signature canvas.
- [ ] Staff cannot proceed past the preview until at least one stroke has been drawn on the canvas.
- [ ] Clicking "Review complete — continue to sign off" transitions to the existing `signoff` card.
- [ ] The `signoff` card's "Sign and submit report" button calls `handleSignOff`, which now includes the `signatureImage` base64 string in the request body.
- [ ] `incident.initialReport.signature.signatureImage` is set in MongoDB after sign-off.
- [ ] `npm run typecheck` and `npm run build` pass.

---

## Test Cases (manual)

```
TEST 1 — Preview renders correctly
  Given: staff has completed all Tier 1, Tier 2 (at least one), and closing questions
  When: last closing answer is submitted
  Then: flow transitions to clinical_preview screen (not signoff card)
  And:  incident type, resident name, all answered Q&A, and signature canvas are visible

TEST 2 — Signature gating
  Given: clinical_preview screen is shown
  When: "Review complete" button is clicked without drawing anything
  Then: button remains disabled; no transition

TEST 3 — Signature captured
  Given: staff draws on the canvas
  When: "Review complete — continue to sign off" is clicked
  Then: phase transitions to signoff; existing sign-off card is shown
  And:  signatureImage state variable holds a non-empty base64 PNG string

TEST 4 — Sign-off stores signature image
  Given: staff draws, continues to signoff, clicks "Sign and submit report"
  When: /api/report/complete is called
  Then: incident.initialReport.signature.signatureImage is a non-empty string in MongoDB

TEST 5 — Clear resets canvas
  Given: staff has drawn on the canvas
  When: "Clear" button is clicked
  Then: canvas is blank; "Review complete" button is disabled again
```

---

## Implementation prompt

```
Phase 11 task 34: Clinical report preview + signature canvas.

Add a new `clinical_preview` phase to the staff report flow in `app/staff/report/page.tsx`.
After the last closing answer, instead of going to `signoff`, go to `clinical_preview`.

Build `components/staff/clinical-report-preview.tsx` using StaffFlowFrame. It should display:
- Facility header, incident type, date, incident ID
- Resident name, room, and reporter name/role (from the session)
- The original narrative and the enhanced narrative (if available in session state)
- All answered Tier 1, Tier 2, and closing Q&A from the session
- A handwriting signature canvas using react-signature-canvas
- A disabled "Review complete — continue to sign off" button that enables once a stroke is drawn

When continue is clicked, extract the base64 PNG from the canvas and call onContinue(signatureImage).
In page.tsx, store this in a signatureImage useState variable and transition to "signoff".
In handleSignOff, include signatureImage in the POST body.

In app/api/report/complete/route.ts, accept signatureImage in the request body and save it to
incident.initialReport.signature.signatureImage via MongoDB update.

In backend/src/models/incident.model.ts, add signatureImage and reportPdfUrl (optional strings)
to SignatureSchema.

Install react-signature-canvas and @types/react-signature-canvas.
Run npm run typecheck and npm run build to verify.
```

---

## Files to create / modify

| File | Change |
|------|--------|
| `components/staff/clinical-report-preview.tsx` | **New** — full preview + signature canvas component |
| `app/staff/report/page.tsx` | Add `clinical_preview` phase; `signatureImage` state; pass to `handleSignOff` |
| `app/api/report/complete/route.ts` | Accept and store `signatureImage` |
| `backend/src/models/incident.model.ts` | Add `signatureImage`, `reportPdfUrl` to `SignatureSchema` |
| `package.json` / `pnpm-lock.yaml` | Add `react-signature-canvas` dependency |

## Status: DONE — 2026-06-06
## Phase: 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Estimated Time: 5–6 hours
## Depends On: Phase 10 complete (report session persistence, Tier 2 quality)

---

## Why This Task Exists

Right now, clicking "Sign and submit" fires a single API call — the nurse
never sees her completed report before signing it. There is no preview,
no formatted clinical record, no signature input. She signs blind.

This task fixes three things:

1. A new `/api/report/preview` endpoint generates the AI clinical record
   BEFORE the nurse sees the preview screen — so she reviews real output,
   not a placeholder.
2. A `clinical_preview` phase shows the full formatted incident record
   with editable sections and a signature canvas.
3. The signature is captured as a base64 PNG and passed to sign-off.

**Critical design decision:** The clinical record is generated at PREVIEW
time, not at sign-off time. This means:
- The nurse sees the AI-structured version of her words before signing
- She can edit any section she disagrees with
- Sign-off becomes a pure write operation (fast, reliable)
- The 3-5 second LLM generation time is invisible during review

---

## What This Task Creates / Modifies

### New route: `app/api/report/preview/route.ts`

```
POST /api/report/preview
Request: { sessionId: string }
Response: {
  clinicalRecord: {
    narrative: string
    residentStatement: string
    interventions: string
    contributingFactors: string
    recommendations: string
    environmentalAssessment: string
  }
  incidentSummary: {
    incidentId: string
    incidentType: string
    residentName: string
    residentRoom: string
    location: string
    staffName: string
    staffRole: string
    incidentDate: string
    incidentTime: string
  }
  tier1QA: Array<{ question: string, answer: string, areaHint: string }>
  tier2QA: Array<{ question: string, answer: string, areaHint: string }>
  closingQA: Array<{ question: string, answer: string, areaHint: string }>
  completenessScore: number
}
```

Server behavior:
1. Auth: `getCurrentUser()`, verify session belongs to user
2. Load `ReportSession` from Redis
3. Call `generateClinicalRecord()` from `lib/agents/clinical-record-generator.ts`
   (same function used in IR-1e, but called here BEFORE sign-off)
4. Build the Q&A arrays from session state (tier1Answers + tier2Answers + closingAnswers
   matched against their question texts)
5. Return the full preview payload
6. Store the generated clinical record in the Redis session so that if the
   nurse refreshes the preview page, it does not regenerate:
   `session.generatedClinicalRecord = clinicalRecord`
7. Update session: `reportPhase = "clinical_preview"`

### New component: `components/staff/clinical-report-preview.tsx`

A full-screen component wrapped in `StaffFlowFrame` that renders:

**Header section**
- WAiK logo or wordmark
- "INCIDENT REPORT — PHASE 1 CLINICAL RECORD" heading
- Incident type badge (teal pill), incident ID, dates

**Incident metadata card**
- Resident: name, room number
- Reporter: name, role
- Location, date, time
- Completeness score ring

**Original narrative section**
- Label: "Your Original Words — Preserved Verbatim"
- Styled blockquote with the nurse's raw `fullNarrative`
- Muted text: "This section is permanently preserved and cannot be edited."

**AI-generated clinical record section**
- Label: "Official Clinical Record"
- Muted text: "Generated from your narrative. You may edit any section before signing."
- Six editable sections, each in a card:
  - Description of Incident (from clinicalRecord.narrative)
  - Resident Statement (from clinicalRecord.residentStatement)
  - Immediate Interventions (from clinicalRecord.interventions)
  - Contributing Factors (from clinicalRecord.contributingFactors)
  - Recommendations (from clinicalRecord.recommendations)
  - Environmental Assessment (from clinicalRecord.environmentalAssessment)
- Each section has a pencil icon. Tapping it toggles the section into a
  textarea. Edits are stored in local component state.

**Questions & Answers section**
- Three groups: "Initial Questions" / "Follow-up Questions" / "Closing Questions"
- Each Q&A pair: question text (bold) → answer text below
- Area hint badge on each question

**Signature section**
- Declaration: "By signing below, I confirm that this report accurately
  reflects my observations and actions."
- Signer name (auto-filled, read-only)
- Date and time (auto-filled, read-only)

**Signature input (two modes with toggle):**

MODE A — Draw signature (default):
- HTML5 canvas using `react-signature-canvas`
- `canvasProps={{ className: "w-full border rounded-lg", style: { height: 120 } }}`
- "Clear" button resets the canvas

MODE B — Type signature:
- Text input with the nurse's name pre-filled
- Rendered in `font-family: 'Caveat', cursive` (Google Fonts import)
- Behind the scenes: render the typed name onto a hidden canvas element
  using `ctx.font = '48px Caveat'; ctx.fillText(name, ...)` and extract
  via `canvas.toDataURL("image/png")` — same base64 PNG output as drawing

Toggle: "Draw my signature" / "Type my name" — radio buttons or tab pills.

**Continue button:**
- "Review complete — continue to sign off"
- Disabled until at least one stroke is drawn OR a name is typed
- onClick: extract base64 PNG from the active signature mode, call
  `onContinue(signatureImage, editedSections)`

### Modified: `app/staff/report/page.tsx`

Add to `ReportPhase` union: `"clinical_preview"`

New state variables:
```ts
const [signatureImage, setSignatureImage] = useState<string | null>(null)
const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecord | null>(null)
const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
const [editedSections, setEditedSections] = useState<Record<string, string>>({})
```

Flow change — after the last closing answer:
```
// OLD: setPhase("signoff")
// NEW:
setIsSubmitting(true)
const res = await fetch("/api/report/preview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId }),
})
const data = await res.json()
setPreviewData(data)
setClinicalRecord(data.clinicalRecord)
setIsSubmitting(false)
setPhase("clinical_preview")
```

Render case for `clinical_preview`:
```tsx
case "clinical_preview":
  return (
    <ClinicalReportPreview
      previewData={previewData!}
      onContinue={(sigImage, edits) => {
        setSignatureImage(sigImage)
        setEditedSections(edits)
        setPhase("signoff")
      }}
    />
  )
```

Gap analysis loading state: while `isSubmitting` is true between closing
and clinical_preview, show the loading screen with "WAiK is preparing
your clinical record for review..."

### Modified: `app/api/report/complete/route.ts`

Accept two new fields in the request body:
```ts
signatureImage?: string          // base64 PNG from canvas
clinicalRecord?: ClinicalRecord  // pre-generated at preview time
```

Changes to the complete handler:
1. If `clinicalRecord` is provided in the body, USE IT directly instead
   of calling `generateClinicalRecord()` again. Apply `editedSections`
   overrides if present.
2. If `clinicalRecord` is NOT provided (backward compatibility), generate
   it as before.
3. Store `signatureImage` on `initialReport.signature.signatureImage`.

This means the LLM call is eliminated from the sign-off path when the
preview flow was used (the normal case). Sign-off becomes a pure write.

### Modified: `backend/src/models/incident.model.ts`

Add to `SignatureSchema`:
```ts
signatureImage: { type: String, default: null },
reportPdfUrl: { type: String, default: null },
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] After the last closing answer, the system calls `/api/report/preview`
- [ ] The preview screen shows the AI-generated clinical record (not a placeholder)
- [ ] Each clinical record section is editable via textarea toggle
- [ ] Original narrative is shown as read-only blockquote
- [ ] All answered Q&A are displayed grouped by tier
- [ ] Signature canvas works on mobile (full-width, 120px height)
- [ ] Typed name fallback renders in cursive font and produces base64 PNG
- [ ] "Continue" button disabled until signature is provided
- [ ] Sign-off receives the signatureImage, pre-generated clinicalRecord, and editedSections
- [ ] `incident.initialReport` stores the MERGED record (base + nurse edits), not the raw AI version
- [ ] `incident.initialReport.signature.signatureImage` is set in MongoDB
- [ ] Sign-off does NOT call generateClinicalRecord() again (uses the preview version)
- [ ] If preview is refreshed, the clinical record is served from Redis session cache
- [ ] Redis session TTL is extended (+1h) when the preview is generated
- [ ] Report card screen shows "Your Phase 1 clinical report is being prepared for download."
- [ ] `lib/config/report-session.ts` ReportSession interface has `generatedClinicalRecord` and `reportPhase` fields

---

## Test Cases

```
TEST 1 — Preview generates clinical record
  Given: staff completes all closing answers
  When: system transitions to clinical_preview
  Then: loading screen shows "Preparing your clinical record..."
        followed by the full preview with AI-generated sections
  Pass/Fail: ___

TEST 2 — Clinical record sections are editable
  Given: preview screen is shown
  When: staff taps pencil icon on "Contributing Factors" section
  Then: section becomes a textarea with current text
        staff can edit; changes persist in component state
  Pass/Fail: ___

TEST 3 — Original narrative is read-only
  Given: preview screen is shown
  Then: "Your Original Words" section has no edit icon
        text is in a styled blockquote
  Pass/Fail: ___

TEST 4 — Draw signature gating
  Given: "Draw my signature" mode is active
  When: "Continue" button is tapped without drawing
  Then: button is disabled
  Pass/Fail: ___

TEST 5 — Draw signature captures base64
  Given: staff draws on the canvas
  When: "Continue" is tapped
  Then: signatureImage state holds a non-empty base64 PNG string
        phase transitions to signoff
  Pass/Fail: ___

TEST 6 — Typed signature fallback
  Given: staff toggles to "Type my name" mode
  When: name is entered and "Continue" is tapped
  Then: signatureImage holds a base64 PNG of the name in cursive
  Pass/Fail: ___

TEST 7 — Sign-off uses pre-generated clinical record
  Given: preview was completed with edits to two sections
  When: sign-off calls /api/report/complete
  Then: the clinicalRecord in the request body matches the preview version
        with the two edited sections applied
        generateClinicalRecord() is NOT called again
  Pass/Fail: ___

TEST 8 — Sign-off stores signatureImage
  Given: staff completes sign-off
  Then: incident.initialReport.signature.signatureImage is a non-empty
        base64 string in MongoDB
  Pass/Fail: ___

TEST 9 — Clear resets canvas
  Given: staff has drawn on canvas
  When: "Clear" is tapped
  Then: canvas is blank; "Continue" button disabled again
  Pass/Fail: ___

TEST 10 — Refresh preserves preview
  Given: preview screen is showing with generated clinical record
  When: page is refreshed (or session reloaded)
  Then: clinical record is served from Redis session cache
        (not regenerated via LLM)
  Pass/Fail: ___

TEST 11 — Nurse edits are preserved through sign-off  [Gap 4]
  Given: nurse edits "Contributing Factors" and "Recommendations" on the preview screen
  When: she completes sign-off
  Then: incident.initialReport stores the EDITED text for those two sections
        The unedited AI text is NOT stored for the sections she changed
  Pass/Fail: ___

TEST 12 — Session TTL extended at preview  [Gap 6]
  Given: nurse reaches the clinical preview screen
  When: the preview API returns successfully
  Then: Redis TTL for the session is >= REPORT_SESSION_TTL_SEC + 3600
        (session will survive at least 1 additional hour of review time)
  Pass/Fail: ___

TEST 13 — PDF status shown on report card  [Gap 7]
  Given: nurse completes sign-off
  When: the report card screen is shown
  Then: "Your Phase 1 clinical report is being prepared for download." is visible
  Pass/Fail: ___
```

---

## Implementation Prompt

```
Phase 11 task 34: Clinical record preview + preview API + signature canvas.

IMPORTANT ARCHITECTURE DECISION: The clinical record is generated at
PREVIEW time, NOT at sign-off time. This is deliberate — the nurse must
see the AI output before signing.

═══════════════════════════════════════════════════════════
PART A — CREATE app/api/report/preview/route.ts
═══════════════════════════════════════════════════════════

POST route. Auth required. Accepts { sessionId }.

1. Load ReportSession from Redis
2. Verify session belongs to current user
3. Check if session.generatedClinicalRecord already exists (cache hit)
   If yes: use it. If no: call generateClinicalRecord() from
   lib/agents/clinical-record-generator.ts with:
   - fullNarrative: session.fullNarrative
   - tier1Answers: session.tier1Answers (keyed by area hint)
   - tier2Answers: session.tier2Answers
   - closingAnswers: session.closingAnswers
   - incidentType: session.incidentType
   - residentName: session.residentName
   - location: session.location
4. Store the result on the session: session.generatedClinicalRecord = result
5. Set session.reportPhase = "signoff"
   IMPORTANT: Do NOT set this to "clinical_preview". The complete route has a hard
   guard `if (session.reportPhase !== "signoff") → 400`. Setting "clinical_preview"
   here would cause sign-off to be rejected when the nurse clicks "Sign and submit".
   "clinical_preview" is a React client-side phase only — it is not persisted to Redis.
6. Save session back to Redis
7. EXTEND SESSION TTL: after saving, call
   `await redis.expire(sessionId, REPORT_SESSION_TTL_SEC + 3600)`
   (+1 hour on top of the base 2 hours) so a nurse who spends time
   reviewing the preview does not lose her session before sign-off.
   If a helper `extendReportSession(sessionId, seconds)` does not exist
   in lib/config/report-session.ts, add it now:
   ```ts
   export async function extendReportSession(
     sessionId: string,
     additionalSeconds: number
   ): Promise<void> {
     await redis.expire(sessionId, REPORT_SESSION_TTL_SEC + additionalSeconds)
   }
   ```
8. Build Q&A arrays from session:
   - tier1QA: map session.tier1Questions with session.tier1Answers
   - tier2QA: map session.tier2Questions with session.tier2Answers
   - closingQA: map session.closingQuestions with session.closingAnswers
8. Return: { clinicalRecord, incidentSummary, tier1QA, tier2QA, closingQA, completenessScore }

═══════════════════════════════════════════════════════════
PART B — CREATE components/staff/clinical-report-preview.tsx
═══════════════════════════════════════════════════════════

"use client" component. Wrap in StaffFlowFrame.

Install: pnpm add react-signature-canvas @types/react-signature-canvas

Props:
interface ClinicalReportPreviewProps {
  previewData: PreviewResponse
  onContinue: (signatureImage: string, editedSections: Record<string, string>) => void
}

State:
- editedSections: Record<string, string> (override map)
- editingSection: string | null (which section is in edit mode)
- signatureMode: "draw" | "type" (default "draw")
- typedName: string
- hasDrawn: boolean

HEADER: WAiK wordmark, "INCIDENT REPORT — PHASE 1", incident type badge,
incident ID, dates.

METADATA CARD: Resident name + room. Reporter name + role. Location.
Completeness ring.

ORIGINAL NARRATIVE: read-only blockquote. Label: "Your Original Words —
Preserved Verbatim." Muted note: "This section is permanently preserved."

CLINICAL RECORD SECTIONS: Six cards (narrative, residentStatement,
interventions, contributingFactors, recommendations, environmentalAssessment).
Each card:
- Section title (bold)
- Content text (from previewData.clinicalRecord[key], overridden by editedSections[key])
- Pencil icon → toggles textarea edit mode
- In edit mode: textarea + "Save" + "Cancel" buttons

Q&A SECTION: Three groups with headers. Each Q&A: question bold, answer below,
area hint badge.

SIGNATURE SECTION:
Declaration text. Auto-filled name and date (read-only).

Toggle pills: "Draw my signature" | "Type my name"

Draw mode:
  <SignatureCanvas
    ref={sigCanvasRef}
    canvasProps={{ className: "w-full border-2 border-gray-200 rounded-lg bg-white", style: { height: 120 } }}
    onEnd={() => setHasDrawn(true)}
  />
  "Clear" button: sigCanvasRef.current.clear(); setHasDrawn(false)

Type mode:
  <input value={typedName} onChange={...} className="w-full ..." />
  Preview: <span style={{ fontFamily: "'Caveat', cursive", fontSize: 36 }}>{typedName}</span>
  Import Caveat from Google Fonts in the component or in globals.css:
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');

  To convert typed name to base64 PNG:
  const canvas = document.createElement("canvas")
  canvas.width = 400; canvas.height = 80
  const ctx = canvas.getContext("2d")!
  ctx.font = "48px Caveat"
  ctx.fillStyle = "#1E2B2C"
  ctx.fillText(typedName, 10, 55)
  return canvas.toDataURL("image/png")

CONTINUE BUTTON:
  "Review complete — continue to sign off"
  Disabled when: (signatureMode === "draw" && !hasDrawn) || (signatureMode === "type" && !typedName.trim())
  onClick:
    const sigImage = signatureMode === "draw"
      ? sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png")
      : convertTypedToCanvas(typedName)
    onContinue(sigImage, editedSections)

═══════════════════════════════════════════════════════════
PART C — MODIFY app/staff/report/page.tsx
═══════════════════════════════════════════════════════════

1. Add "clinical_preview" to ReportPhase union type
2. Add state: signatureImage, clinicalRecord, previewData, editedSections
3. After last closing answer (where phase was set to "signoff"):
   - Instead: call POST /api/report/preview with { sessionId }
   - Show loading: "WAiK is preparing your clinical record for review..."
   - On success: setPreviewData(data), setPhase("clinical_preview")
4. clinical_preview render case: show <ClinicalReportPreview>
5. onContinue callback: store signatureImage + editedSections, setPhase("signoff")
6. In handleSignOff: include signatureImage, clinicalRecord, and editedSections
   in the POST /api/report/complete body
7. In the reportcard render case, check for reportCard.pdfStatus and
   display a confirmation message below the completion screen:
   ```tsx
   {reportCard?.pdfStatus && (
     <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
       <FileText className="h-3.5 w-3.5" />
       {reportCard.pdfStatus}
     </p>
   )}
   ```
   Import FileText from lucide-react if not already imported.

═══════════════════════════════════════════════════════════
PART F — MODIFY lib/config/report-session.ts  [Gap 1 fix]
═══════════════════════════════════════════════════════════

Add only this one optional field to the ReportSession interface:

```ts
generatedClinicalRecord?: {
  narrative: string
  residentStatement: string
  interventions: string
  contributingFactors: string
  recommendations: string
  environmentalAssessment: string
} | null
```

NOTE: Do NOT add "clinical_preview" to the ReportPhase union and do NOT
add reportPhase to the interface — it already exists as `reportPhase: ReportPhase`.
The preview route sets this to "signoff" (not "clinical_preview"), so the
complete route's guard passes without any changes to the type union.

═══════════════════════════════════════════════════════════
PART D — MODIFY app/api/report/complete/route.ts
═══════════════════════════════════════════════════════════

1. Accept signatureImage?: string, clinicalRecord?: ClinicalRecord, and
   editedSections?: Record<string, string> in the request body.

2. EXPLICIT MERGE — apply nurse's edits before storing:
   const finalRecord = body.clinicalRecord
     ? { ...body.clinicalRecord, ...(body.editedSections ?? {}) }
     : await generateClinicalRecord(session)   // fallback: no preview was used
   Store finalRecord (NOT body.clinicalRecord directly) in initialReport.

3. If clinicalRecord is NOT provided in the body: generate as before
   (backward compatibility path, e.g. tests or old clients).

4. Store signatureImage on initialReport.signature.signatureImage.

5. Add to the report card response:
   pdfStatus: "Your Phase 1 clinical report is being prepared for download."

═══════════════════════════════════════════════════════════
PART E — MODIFY backend/src/models/incident.model.ts
═══════════════════════════════════════════════════════════

Add to SignatureSchema:
  signatureImage: { type: String, default: null }
  reportPdfUrl: { type: String, default: null }

Run npm run typecheck and npm run build.
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `app/api/report/preview/route.ts` | **New** — generate clinical record for preview |
| `components/staff/clinical-report-preview.tsx` | **New** — preview screen + signature canvas |
| `app/staff/report/page.tsx` | Add `clinical_preview` phase; preview API call; signature state; pdfStatus display |
| `app/api/report/complete/route.ts` | Accept pre-generated clinicalRecord + signatureImage; explicit editedSections merge |
| `backend/src/models/incident.model.ts` | Add signatureImage, reportPdfUrl to SignatureSchema |
| `lib/config/report-session.ts` | Add `generatedClinicalRecord` and `reportPhase` to ReportSession interface; add `extendReportSession` helper |
| `package.json` | Add react-signature-canvas dependency |

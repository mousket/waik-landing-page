## Status: DONE — 2026-06-07
## Phase: 11e — PDF includes snapshot
## Estimated Time: 2 hours
## Depends On: task-50

---

## Why This Task Exists

Downloaded PDFs must match the signed HTML document: WAiK summary, recommendations, narrative, sections, Q&A, and **embedded signature image**.

---

## What This Task Creates / Modifies

1. **`components/staff/phase1-pdf-template.tsx`**
   - Clinical summary + WAiK recommendations (nursing + leadership) before verbatim narrative
   - Source: `phase1SignoffSnapshot` via shared helpers; legacy fallback to `enhancedNarrative`
   - Signature uses stored declaration + data-URL `Image`

2. **`lib/report/phase1-signed-report-data.ts`**
   - Exported `resolvePhase1ClinicalRecord`, `resolvePhase1PreviewInsights`, `clinicalRecordToSections`, `hasStructuredClinicalSections` for PDF + HTML parity

3. **`lib/report/generate-phase1-pdf.ts`** / **`app/api/incidents/[id]/report/pdf/route.ts`**
   - No changes required — both already pass full incident to `Phase1PdfTemplate`

4. **`__tests__/phase1-signed-report-data.test.ts`**
   - PDF snapshot helper coverage

---

## Success Criteria

- [x] PDF for newly signed incident includes all three insight blocks
- [x] Signature image visible in PDF
- [x] Legacy incidents without snapshot still generate valid PDF (degraded)
- [x] `npm run test` passes if PDF helpers have tests

# Phase 11c — Clinical Document Experience & WAiK Branding
## Status: IN PROGRESS (WAiK logo — 2026-06-06)
## Created: 2026-06-06
## Depends On: [Phase 11b](../phase_11_b/README.md) complete (tasks 34–39)

---

## What This Phase Builds

Phase 11b shipped the **functional** sign-off pipeline: AI clinical record at preview
time, signature capture (draw + typed), server-side PDF, and post-submit report page.

Phase 11c closes the gap between **what works** and **what the product should feel like**:

> When a nurse finishes all questions and gaps, she sees a **formal clinical document**
> with **WAiK branding** in the letterhead, full narrative and Q&A, editable clinical
> sections — and must **actively sign** (draw or typed cursive) before the report is
> submitted. What she signs is what appears in the PDF.

**Client / facility logo upload is explicitly deferred** to a future phase. For now:
facility name as text + WAiK wordmark only.

### Done (2026-06-06) — WAiK logo v1

- `ClinicalDocumentLetterhead` — facility name + WAiK logo on preview and post-submit report page
- `lib/waik-logo-asset.ts` — embedded PNG for server-side PDF generation
- `Phase1PdfTemplate` — WAiK logo in PDF header (not footer text only)
- Preview API returns `facilityName` for letterhead

---

## Current State vs Desired State

| Area | Today (11b) | Desired (11c) |
|------|-------------|---------------|
| Preview layout | Mobile card UI with gradients | White “page” document: letterhead, sections, Q&A tables |
| WAiK logo | Small logo in preview header only | Prominent co-brand in preview **and** PDF |
| Facility / customer logo | **Deferred** — not in this phase | Future: optional upload in letterhead |
| Sign-off flow | ~~Preview sign → separate `signoff` card~~ | ✅ Single screen: review → sign → **Submit signed report** (task 44) |
| Preview API failure | ~~Falls through to signoff without signature~~ | ✅ `preview_error` + retry UI (task 44) |
| Resume in-progress report | ~~Resumes to bare signoff card~~ | ✅ Resume loads clinical preview (task 44) |
| Preview vs PDF vs re-open | Three slightly different layouts | One shared document model + consistent rendering |
| Explicit submit CTA | Last closing **answer** auto-triggers preview | Optional “Review & sign report” when closing board is complete |

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Letterhead (now) | **`ClinicalDocumentLetterhead`** — facility name + WAiK logo | Shared by preview + post-submit HTML |
| Client/facility logo | **Deferred** | No upload UI or `logoUrl` schema in v1 |
| PDF WAiK logo | **Embedded base64 from `public/waik-logo.png`** | Reliable in serverless; no self-fetch |
| Sign-off UX | **Merge `signoff` into `clinical_preview`** (task 44) | ✅ Done |
| Clinical record timing | **Keep preview-time generation** (unchanged from 11b) | Do not move LLM call back to sign-off |

---

## Subtask Index

| Task | What It Builds | Est. Time | Track |
|------|---------------|-----------|-------|
| [40](./task-40-shared-clinical-document-shell.md) | Shared `Phase1ClinicalDocument` shell + document typography tokens | 4–5 hrs | Document |
| [41](./task-41-preview-document-restyle.md) | Restyle `ClinicalReportPreview` as formal document; wire shared shell | 3–4 hrs | Document |
| ~~42~~ | ~~Facility logo upload~~ — **DEFERRED** (future phase) | — | — |
| [43](./task-43-cobranded-pdf-and-report-page.md) | WAiK logo in PDF + report page parity (**WAiK portion done**) | 1–2 hrs remain | Branding |
| [44](./task-44-unified-signoff-flow-done.md) | Merge sign-off steps; fix preview failure + resume-to-preview paths | ✅ Done | Flow |
| [45](./task-45-integration-verification.md) | End-to-end QA, tests, pilot checklist updates | 2–3 hrs | QA |

**Total: ~19–25 hours across 6 tasks.**

---

## Dependency Graph

```
40 → 41 → 44
40 → 43
42 → 41, 43
44 → 45
43 → 45
```

Tasks 40 and 42 can start in parallel. Task 44 should wait for 41 (and ideally 42 for
branding in the merged submit screen).

---

## Schema Changes

| Area | Change | Task |
|------|--------|------|
| `FacilityDocument` / `facility.model.ts` | Add optional `logoUrl?: string` | 42 |
| `PreviewResponse` type | Add `facilityName`, `facilityLogoUrl?`, `waikLogoUrl` | 42 |
| Incident / Signature | No new fields | — |

All changes are additive.

---

## Files Expected to Change

| File | Task(s) |
|------|---------|
| `components/staff/phase1-clinical-document.tsx` | 40 (**new**) |
| `components/staff/clinical-report-preview.tsx` | 41, 44 |
| `app/staff/report/page.tsx` | 41, 44 |
| `app/staff/incidents/[id]/report/page.tsx` | 40, 43 |
| `components/staff/phase1-pdf-template.tsx` | 43 |
| `app/api/report/preview/route.ts` | 42 |
| `backend/src/models/facility.model.ts` | 42 |
| `app/admin/settings/...` (facility branding) | 42 |
| `lib/report/reconstruct-session-from-incident.ts` | 44 |
| `documentation/pilot_1_plan/PILOT_READY.md` | 45 |

---

## Out of Scope (11c)

- Third-party e-sign (DocuSign, Adobe Sign)
- Multi-party signatures (DON countersign at Phase 1)
- Organization-level logo separate from facility
- Inline PDF iframe preview before sign (HTML document is sufficient for pilot)
- Re-generating clinical record at submit when preview was skipped intentionally
- Admin closure report (`/admin/incidents/[id]/report`) restyle — note for future phase

---

## Success Criteria (phase complete when)

- [ ] Nurse sees document-style preview (not card app UI) after last closing answer
- [ ] Letterhead shows facility name + facility logo (when configured) + WAiK logo
- [ ] Draw and typed signature both required before submit button enables
- [x] One submit action on the preview screen — no redundant signoff card
- [x] Preview failure shows retry UI; submit blocked without signature
- [x] Resume from dashboard at sign-off-ready state opens clinical preview
- [ ] Downloaded PDF letterhead matches preview letterhead
- [ ] `npm run typecheck && npm run build` pass

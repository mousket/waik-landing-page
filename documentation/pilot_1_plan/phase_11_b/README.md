# Phase 11 — Clinical Report PDF & Incident-Scoped Intelligence
## Status: IN PROGRESS (tasks 34–39 implemented 2026-06-06)
## Created: 2026-06-06

---

## What This Phase Builds

Two features that complete the Phase 1 incident reporting experience:

**Feature 1 — DocuSign-Style Clinical Report + PDF**
Before sign-off, the nurse sees a full formatted preview of her incident
record — facility header, all Q&A, the AI-generated clinical narrative,
and a signature canvas. She reviews, edits if needed, draws her signature,
and submits. After submission, a server-side PDF is generated and stored
as a downloadable link on the incident detail page.

**Feature 2 — Incident-Scoped Intelligence**
Every answer recorded during a report is individually vectorized in
real time. A new Intelligence tab on the staff incident detail page lets
the nurse ask questions about her specific incident and receive answers
grounded only in that incident's Q&A — with inline citations and
conversation history.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When to generate the clinical record | **At preview time, NOT at sign-off** | The nurse must see the AI-generated record before signing. If generated at sign-off, she signs blind on the clinical structuring. A new `/api/report/preview` endpoint generates the record; `/api/report/complete` persists it. |
| PDF generation | **Server-side `@react-pdf/renderer`** | Produces a real `.pdf` file with a URL. Browser print rejected (inconsistent on iOS Safari, no storable URL). |
| Embedding granularity | **Per-answer** (one embedding per Q&A pair) | Enables question-level retrieval; makes intelligence available during the report, not just after sign-off. |
| Embedding text composition | **Include tier, area hint, incident type, and resident** | Richer context produces better semantic matches for both incident-scoped and future cross-incident search. |
| Intelligence tab UX | **Conversation history, not single-shot** | Nurses naturally ask follow-ups. A stateful conversation array costs nothing to implement and dramatically improves the experience. |
| Signature input | **Canvas drawing + typed name fallback** | Not every nurse is comfortable drawing on a phone. Typed name rendered in cursive font, captured as the same base64 PNG output. |
| Per-answer storage | **MongoDB `incident_answer_vectors` collection** | Survives server restarts; compatible with Atlas Vector Search pre-filtering by incidentId. |
| Intelligence access control | **`isIncidentReporter` on staff route** | Matches existing access pattern. Admin route left untouched. |

---

## Gaps Identified and Addressed (vs Cursor's Original)

| Gap | Severity | How We Fixed It |
|-----|----------|-----------------|
| Preview showed no AI-enhanced narrative (generated at sign-off, after preview) | HIGH | New `/api/report/preview` endpoint generates the clinical record BEFORE the preview screen. Sign-off becomes a pure write. |
| `questionText` not sent in the answer request body | HIGH | Task 37 explicitly adds `questionText` and `tier` to the client-side `handleAnswer` body. |
| No conversation history in Intelligence tab | MEDIUM | Task 39 adds a `useState<ConversationEntry[]>` array. Each Q&A appends. Full history displayed. |
| No PDF retry mechanism | MEDIUM | Task 35 GET route checks if `reportPdfUrl` exists; if so, redirects. If null for a completed incident, regenerates on demand. |
| Missing tier/context in embedding text | LOW | Task 37 embedding text includes incident type, resident, tier, and area hint. |
| No Atlas index verification in code | LOW | Task 38 adds a try/catch on `$vectorSearch` with a clear error message naming the missing index. |
| No typed-name signature fallback | LOW | Task 34 adds a toggle: Draw / Type. Typed name rendered in Caveat font on canvas, same base64 output. |
| No report card PDF confirmation | LOW | Task 34 sign-off transition shows "Your report is being prepared for download." |

---

## Subtask Index

| Task | What It Builds | Est. Time | Track |
|------|---------------|-----------|-------|
| 34 | Clinical record preview + signature canvas + preview API | 5–6 hrs | PDF |
| 35 | Server-side PDF generation (`@react-pdf/renderer`) | 4–5 hrs | PDF |
| 36 | Staff printable report page + download button | 2–3 hrs | PDF |
| 37 | Per-answer vectorization + `incident_answer_vectors` collection | 4–5 hrs | Intel |
| 38 | Incident-scoped vector search + staff intelligence API | 3–4 hrs | Intel |
| 39 | Intelligence tab with conversation history | 3–4 hrs | Intel |

**Total: ~21–27 hours across 6 tasks.**

---

## Dependency Graph

```
34 → 35 → 36       (PDF track)
37 → 38 → 39       (Intelligence track)

These two tracks are fully independent and can run in parallel.
```

---

## Schema Changes

| Area | Change | Task |
|------|--------|------|
| `SignatureSchema` in incident.model.ts | Add `signatureImage?: String` (base64 PNG) | 34 |
| `SignatureSchema` in incident.model.ts | Add `reportPdfUrl?: String` | 35 |
| New collection: `incident_answer_vectors` | `{ incidentId, facilityId, questionId, questionText, answerText, tier, areaHint, incidentType, residentName, vector, embeddedAt }` | 37 |
| Atlas Vector Search index on `incident_answer_vectors` | Pre-filter on `incidentId` + `facilityId` | 38 (manual step) |

All schema changes are additive and non-breaking. Existing incidents without the new fields continue to work.

---

## What's done vs what remains

### Done

| Task | What it builds |
|------|---------------|
| 34 | Preview API + clinical record preview + signature canvas (draw + type) |
| 35 | Server-side PDF generation (`@react-pdf/renderer`) + caching + on-demand retry |
| 36 | Staff printable report page + download button + signature display |
| 37 | Per-answer vectorization with full context + `incident_answer_vectors` collection |
| 38 | Atlas index + incident-scoped search + staff intelligence API (POST with conversation history) |
| 39 | Intelligence tab with conversation history + suggested questions |

### Remains

- **Manual:** Create Atlas Vector Search index `incident_answer_vectors_vector_index` on `incident_answer_vectors` (see task 38).
- **Optional:** Set `BLOB_STORAGE_URL` for external PDF blob caching (pilot streams PDF on demand without it).
- **Presentation polish:** [Phase 11c](../phase_11_c/README.md) — formal document preview, facility co-branding, unified sign-off flow (tasks 40–45).

---

## Files Created / Modified

| File | Task | Change |
|------|------|--------|
| `app/api/report/preview/route.ts` | 34 | **New** — generates clinical record for preview |
| `components/staff/clinical-report-preview.tsx` | 34 | **New** — preview screen + signature canvas |
| `app/staff/report/page.tsx` | 34 | Add `clinical_preview` phase; `signatureImage` + `clinicalRecord` state |
| `backend/src/models/incident.model.ts` | 34, 35 | Add `signatureImage`, `reportPdfUrl` to SignatureSchema |
| `app/api/report/complete/route.ts` | 34, 35 | Accept `signatureImage` + pre-generated `clinicalRecord`; trigger async PDF |
| `components/staff/phase1-pdf-template.tsx` | 35 | **New** — `@react-pdf/renderer` component tree |
| `app/api/incidents/[id]/report/pdf/route.ts` | 35 | **New** — PDF generation + streaming/storage |
| `lib/report/generate-phase1-pdf.ts` | 35 | **New** — helper for async PDF generation |
| `app/staff/incidents/[id]/report/page.tsx` | 36 | **New** — staff printable report page |
| `components/staff/staff-incident-detail-view.tsx` | 36, 39 | Add download button (36) + Intelligence tab (39) |
| `backend/src/models/incident-answer-vector.model.ts` | 37 | **New** — Mongoose schema |
| `lib/agents/answer-embedding-service.ts` | 37 | **New** — per-answer embedding + upsert |
| `app/api/report/answer/route.ts` | 37 | Fire background per-answer embedding |
| `app/staff/report/page.tsx` | 37 | Add `questionText`, `tier` to answer request body |
| `lib/agents/vector-search.ts` | 38 | Add `incidentId` to SearchFilters; add `searchIncidentAnswers` |
| `app/api/staff/incidents/[id]/intelligence/route.ts` | 38 | **New** — per-incident intelligence API |
| `components/staff/staff-incident-intelligence-tab.tsx` | 39 | **New** — Intelligence tab with conversation history |

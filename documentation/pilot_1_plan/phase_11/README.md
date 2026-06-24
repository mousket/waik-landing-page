# Phase 11 — Clinical Report PDF & Incident-Scoped Intelligence

**Created:** 2026-06-06  
**Last updated:** 2026-06-06  
**Status:** **PLANNING** — tasks 34–39 open; no implementation started.

This phase ships two features that complete the Phase 1 incident reporting experience and give staff meaningful intelligence tied to a specific incident:

1. **DocuSign-style Phase 1 clinical report** — a formatted preview of the full incident record that staff review and sign (handwriting canvas) before submitting. After sign-off, a true server-side PDF is generated via `@react-pdf/renderer` (Option B), stored on the incident, and downloadable from the incident detail page.

2. **Incident-scoped community intelligence** — every answer recorded during a report is vectorized in real time and stored with an `incidentId` tag. A new Intelligence tab on the staff incident detail page lets staff (and future admin) ask questions and get answers grounded only in that specific incident's data.

**Depends on:** Phases 9 and 10 complete (report session persistence, Tier 2 quality).  
**Explicitly out of scope:** automated regression tests for PDF rendering, admin Intelligence tab redesign, mobile-only layout changes.

---

## What we set out to build

### Feature 1 — Phase 1 Clinical Report + PDF

| Capability | Description |
|---|---|
| Clinical preview screen | Before sign-off, staff see the complete formatted incident record: facility header, incident metadata, all Tier 1 / Tier 2 / closing Q&A, and the AI-enhanced narrative side-by-side |
| Handwriting signature canvas | HTML5 canvas (or `react-signature-canvas`) embedded at the bottom of the preview; staff draw their signature |
| Server-side PDF (Option B) | `@react-pdf/renderer` generates a `.pdf` file at `/api/incidents/[id]/report/pdf`; the file URL is stored on `incident.initialReport.signature.reportPdfUrl` |
| Staff printable report page | `/staff/incidents/[id]/report` — standalone page rendering the Phase 1 clinical record (accessible only to the incident reporter) |
| Download button on detail page | "View Phase 1 report" button in the My Report tab and sidebar; links to the PDF URL; enabled when `phase >= phase_1_complete` |
| Signature display | `incident.initialReport.signature` is shown in the My Report tab: signed-by name, date, drawn signature image |

### Feature 2 — Incident-Scoped Intelligence

| Capability | Description |
|---|---|
| Per-answer vectorization | `/api/report/answer` generates a small embedding for each answer (questionText + answerText) and upserts to a new `incident_answer_vectors` collection with `incidentId`, `facilityId`, `tier`, etc. |
| Durable question-level embeddings | `lib/embeddings.ts` in-memory cache replaced with MongoDB-backed store; embeddings survive restarts |
| Incident-scoped vector search | Atlas Vector Search index on `incident_answer_vectors` with `incidentId` as a pre-filter; `SearchFilters` extended with optional `incidentId` |
| Staff per-incident intelligence API | New route `/api/staff/incidents/[id]/intelligence?question=...`; scoped to that incident's vectors; access-controlled via `isIncidentReporter` |
| Intelligence tab on staff incident detail | 4th tab on `staff-incident-detail-view.tsx`; suggested questions seeded from incident type; shows citations as answer cards |

---

## What we've learned (context from prior phases)

- **One embedding per incident is not enough.** The current model generates one vector at sign-off from the full enhanced narrative. This means all questions and answers are mixed into a single point — per-question retrieval is impossible and the embedding is stale during the entire Phase 1 in-progress period.
- **The admin per-incident intelligence route already exists.** `/api/incidents/[id]/intelligence` (used in the admin incident detail page) does per-incident RAG via `searchSimilarQuestions` and `IntelligenceQAAgent`. The pattern works; we need a staff-accessible version and finer granularity.
- **The sign-off API is fully wired.** `incident.initialReport.signature` stores `signedBy`, `signedByName`, `signedAt`, `role`, `declaration`. Adding `signatureImage` (base64 PNG) and `reportPdfUrl` are schema-additive, non-breaking changes.
- **Citations exist but are discarded.** `/api/intelligence/query` already returns `citations`; the staff intelligence client throws them away. Wiring citations is a one-line change once the infrastructure is there.
- **`@react-pdf/renderer` is the right call for Option B.** It produces real PDF bytes from a React component tree on the server (Node), can be streamed as a response, and is SSR-compatible in Next.js API routes. It adds ~400KB to the server bundle but nothing to the client bundle since it only runs in an API route.

---

## What needs to happen next (task index)

| Order | ID | Task | Effort | Task file | Status |
|------:|----|------|--------|-----------|--------|
| 1 | **34** | Clinical report preview screen + signature canvas | L | [task-34-clinical-report-preview.md](./task-34-clinical-report-preview.md) | Open |
| 2 | **35** | Server-side PDF generation (Option B, `@react-pdf/renderer`) | L | [task-35-server-side-pdf.md](./task-35-server-side-pdf.md) | Open |
| 3 | **36** | Staff printable report page + download button on detail page | M | [task-36-staff-report-page-download.md](./task-36-staff-report-page-download.md) | Open |
| 4 | **37** | Per-answer vectorization + `incident_answer_vectors` collection | L | [task-37-per-answer-vectorization.md](./task-37-per-answer-vectorization.md) | Open |
| 5 | **38** | Incident-scoped vector search + staff intelligence API | M | [task-38-incident-scoped-intelligence-api.md](./task-38-incident-scoped-intelligence-api.md) | Open |
| 6 | **39** | Intelligence tab on staff incident detail page | M | [task-39-intelligence-tab.md](./task-39-intelligence-tab.md) | Open |

**Total estimate:** ~14–20 hours across 6 tasks.

---

## Dependency order

```
34 → 35 → 36
          ↘
           (parallel) 37 → 38 → 39
```

- **34 must precede 35** — the signature canvas (task 34) needs to be complete before the PDF generation route can render the signature image.
- **35 must precede 36** — the download button links to the PDF URL stored by task 35's API route.
- **37 must precede 38** — Atlas Vector Search index can only be configured once the `incident_answer_vectors` collection exists with real documents.
- **38 must precede 39** — the Intelligence tab calls the per-incident API built in task 38.
- **Tasks 34–36 and tasks 37–39 are independent of each other** and can be built in parallel across two sessions.

---

## Schema changes required

| Area | Change | Blocks other tasks? |
|------|--------|---------------------|
| `Incident.initialReport.signature` | Add `signatureImage?: string` (base64 PNG) | Yes — task 34 writes it; task 35 reads it to render in PDF |
| `Incident.initialReport.signature` | Add `reportPdfUrl?: string` | Yes — task 35 writes it; task 36 reads it for download link |
| New collection: `incident_answer_vectors` | `{ incidentId, facilityId, questionId, questionText, answerText, tier, vector, embeddedAt }` | Yes — required before Atlas index setup in task 38 |
| Atlas Vector Search index | Add `incidentId` as pre-filter field on `incident_answer_vectors` | Yes — required before task 38 queries work |
| `backend/src/models/incident.model.ts` | Add new signature fields to `SignatureSchema` | Task 34 |

---

## Decisions made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF generation approach | **Option B — server-side `@react-pdf/renderer`** | Produces a real `.pdf` file with a URL. Enables sharing by link, embedding in email, and future admin access to the same document. Browser print (Option A) rejected because it cannot produce a storable URL and behaves inconsistently on iOS Safari. |
| Embedding granularity | **Per-answer** (one embedding per Q&A pair, not per incident) | Enables incident-scoped retrieval at the question level; prevents the intelligence agent from mixing all answers into one undifferentiated vector. |
| Intelligence storage | **MongoDB `incident_answer_vectors` collection** (not in-memory cache) | Survives server restarts; compatible with Atlas Vector Search pre-filtering. |
| Staff API access control | `isIncidentReporter` check on per-incident intelligence route | Matches existing staff access pattern; Phase 2 admin users already have broader access via the admin route. |

---

## What else to consider (future phases, not this one)

- **Admin Intelligence tab redesign** — the admin incident detail page has an Intelligence tab that also uses the in-memory embedding cache. Once task 37's `incident_answer_vectors` collection is live, the admin tab can be migrated to the same source.
- **PDF email delivery** — the stored PDF URL makes it trivial to attach the Phase 1 report to the admin notification email sent at sign-off. Not in scope here but the URL will be available.
- **Facility-wide intelligence search** — the `/api/intelligence/query` endpoint currently discards citations. Once per-answer vectors are stored, a future phase can improve the facility-wide search quality by treating each answer as a chunk rather than each incident as a document.
- **Sign-off IP address** — the `Signature` schema has an `ipAddress` field that is never populated. The complete route has access to the request; this is a one-line addition if compliance requires it.
- **Analytics on unanswered questions** — the `incident_answer_vectors` collection will implicitly record which questions were answered. A future reporting view could show completion rates per question across all incidents.

---

## When a task is done (convention)

1. Set `## Status: DONE` and completion date at the top of the task file.
2. Rename: `task-NN-slug.md` → `task-NN-slug-done.md`.
3. Update this README: change task row Status from **Open** to **Done (v1)** with a one-line note.
4. Update **What's done vs what remains** below.
5. When all 6 tasks are done, set phase Status to **IMPLEMENTED** and update `../PILOT_READY.md`.

---

## What's done vs what remains

### Done
*(nothing yet — phase opened 2026-06-06)*

### Remains
- Task 34: Clinical preview screen + signature canvas
- Task 35: Server-side PDF generation
- Task 36: Staff printable report page + download button
- Task 37: Per-answer vectorization + new collection
- Task 38: Incident-scoped vector search + staff API
- Task 39: Intelligence tab on staff incident detail

---

## Files that will be created / modified

| File | Task | Change |
|------|------|--------|
| `app/staff/report/page.tsx` | 34 | Add `clinical_preview` phase between `closing` and `signoff` |
| `components/staff/clinical-report-preview.tsx` | 34 | **New** — formatted incident record + signature canvas |
| `backend/src/models/incident.model.ts` | 34 | Add `signatureImage`, `reportPdfUrl` to `SignatureSchema` |
| `app/api/report/complete/route.ts` | 34, 35 | Accept `signatureImage`; trigger PDF generation after sign-off |
| `app/api/incidents/[id]/report/pdf/route.ts` | 35 | **New** — `@react-pdf/renderer` PDF generation + storage |
| `components/staff/phase1-pdf-template.tsx` | 35 | **New** — `@react-pdf/renderer` React component tree for the PDF |
| `app/staff/incidents/[id]/report/page.tsx` | 36 | **New** — staff printable report page |
| `components/staff/staff-incident-detail-view.tsx` | 36 | Add download button to My Report tab + sidebar |
| `app/api/report/answer/route.ts` | 37 | Trigger per-answer embedding after saving answer |
| `lib/agents/answer-embedding-service.ts` | 37 | **New** — embed questionText + answerText, upsert to `incident_answer_vectors` |
| `lib/agents/vector-search.ts` | 38 | Add `incidentId` to `SearchFilters`; add pre-filter clause |
| `app/api/staff/incidents/[id]/intelligence/route.ts` | 38 | **New** — per-incident intelligence API for staff |
| `components/staff/staff-incident-detail-view.tsx` | 39 | Add Intelligence tab |
| `components/staff/staff-incident-intelligence-tab.tsx` | 39 | **New** — tab UI with suggested questions + answer + citations |

---

## Primary code touchpoints

| Area | Files |
|------|-------|
| Report flow | `app/staff/report/page.tsx` |
| Sign-off API | `app/api/report/complete/route.ts` |
| Incident model | `backend/src/models/incident.model.ts` |
| Answer API | `app/api/report/answer/route.ts` |
| Vector search | `lib/agents/vector-search.ts` |
| Staff incident detail | `components/staff/staff-incident-detail-view.tsx` |

---

## Related docs

- Phase 9 (report persistence, resume): [`../phase_9/README.md`](../phase_9/README.md)
- Phase 10 (Tier 2 gap quality): [`../phase_10/README.md`](../phase_10/README.md)
- Master checklist: [`../PILOT_READY.md`](../PILOT_READY.md)
- Blueprint: [`../incident_report/WAiK_Incident_Reporting_Blueprint.md`](../incident_report/WAiK_Incident_Reporting_Blueprint.md)

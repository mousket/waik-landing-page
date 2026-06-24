# Phase 11 — Agent handoff

**Read first:** [`README.md`](./README.md) — full context, decisions, schema changes, and the done convention.

---

## One-sentence mission

Ship a **DocuSign-style Phase 1 clinical report with a server-side PDF** and an **incident-scoped Intelligence tab** that answers questions using only that incident's vectorized Q&A.

---

## Execute in order

| Step | File | What it builds |
|------|------|----------------|
| 1 | `task-34-clinical-report-preview.md` | Clinical preview screen + handwriting signature canvas before sign-off |
| 2 | `task-35-server-side-pdf.md` | `@react-pdf/renderer` API route + PDF storage; `reportPdfUrl` on incident |
| 3 | `task-36-staff-report-page-download.md` | `/staff/incidents/[id]/report` page + download button on detail page |
| 4 | `task-37-per-answer-vectorization.md` | Per-answer embedding at recording time → `incident_answer_vectors` collection |
| 5 | `task-38-incident-scoped-intelligence-api.md` | Atlas index pre-filter + staff per-incident intelligence API |
| 6 | `task-39-intelligence-tab.md` | Intelligence tab on staff incident detail page |

Tasks 1–3 and tasks 4–6 are independent tracks. They may be parallelized across two sessions.

---

## Critical constraints

- **Option B only** — generate a real server-side PDF file; do **not** fall back to `window.print()`.
- **`isIncidentReporter` access control** on the staff intelligence API — only the original reporter may query per-incident intelligence (same pattern as the resume and complete routes).
- **Non-breaking schema changes only** — `signatureImage` and `reportPdfUrl` are optional fields; existing incidents without them must not break any existing UI.
- **Do not modify the admin intelligence route** (`/api/incidents/[id]/intelligence`) — build a separate staff-scoped route.
- **Atlas Vector Search index must be created before task 38 queries work** — document the index definition in task 38 so the human operator can create it in the Atlas UI before deploying.

---

## Key existing files to read before starting

| File | Why |
|------|-----|
| `app/api/report/complete/route.ts` | Understand what `initialReport` already stores; where to hook PDF trigger |
| `app/api/report/answer/route.ts` | Understand where to hook per-answer embedding |
| `backend/src/models/incident.model.ts` | `SignatureSchema` — add `signatureImage`, `reportPdfUrl` here |
| `lib/agents/vector-search.ts` | `SearchFilters` — extend with `incidentId` in task 38 |
| `app/api/incidents/[id]/intelligence/route.ts` | Admin pattern to mirror for staff route |
| `components/staff/staff-incident-detail-view.tsx` | Where to add the Intelligence tab (task 39) and download button (task 36) |
| `app/staff/report/page.tsx` | Where to insert the `clinical_preview` phase step (task 34) |

---

## When you finish a task

1. Mark `## Status: DONE` + date at top of the task file.
2. Rename: `task-NN-slug.md` → `task-NN-slug-done.md`.
3. Update **`README.md`** task table (Open → Done v1) and the **What's done vs what remains** section.

---

## Do not

- Use `window.print()` for PDF — always `@react-pdf/renderer` server-side (Option B).
- Reuse the single-embedding `generateAndStoreEmbedding` path for per-answer vectors — this is a separate pipeline targeting `incident_answer_vectors`.
- Modify the admin `/api/incidents/[id]/intelligence` route — build a new staff route.
- Add Phase 11 Vitest suites for LLM output or PDF rendering unless explicitly requested.
- Populate `reportPdfUrl` in the complete route synchronously if PDF generation is slow — fire it async like the existing `generateAndStoreEmbedding` call.

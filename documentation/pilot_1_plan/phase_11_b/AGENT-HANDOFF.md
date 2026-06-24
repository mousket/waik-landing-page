# Phase 11 — Agent Handoff

**Read first:** [`README.md`](./README.md) — full context, decisions, gaps addressed, schema changes.

---

## One-sentence mission

Ship a **DocuSign-style Phase 1 clinical report with AI-generated preview,
signature canvas, and server-side PDF** plus an **incident-scoped Intelligence
tab with per-answer vectorization and conversation history**.

---

## Execute in order

| Step | File | What it builds |
|------|------|----------------|
| 1 | `task-34-clinical-report-preview.md` | Preview API + clinical record preview + signature canvas (draw + type) |
| 2 | `task-35-server-side-pdf.md` | `@react-pdf/renderer` PDF generation + caching + on-demand retry |
| 3 | `task-36-staff-report-page-download.md` | Printable report page + download button + signature display |
| 4 | `task-37-per-answer-vectorization.md` | Per-answer embedding with full context + `incident_answer_vectors` collection |
| 5 | `task-38-incident-scoped-intelligence-api.md` | Atlas index + incident-scoped search + staff intelligence API |
| 6 | `task-39-intelligence-tab.md` | Intelligence tab with conversation history + suggested questions |

Tasks 1–3 (PDF track) and 4–6 (Intelligence track) are independent.
They can run in parallel across two sessions.

---

## Critical constraints (read before every task)

1. **Clinical record generated at PREVIEW time, not sign-off.**
   `/api/report/preview` calls `generateClinicalRecord()`. The nurse
   reviews and edits the output. `/api/report/complete` receives the
   pre-generated record and writes it directly — no second LLM call.

2. **`questionText`, `tier`, and `areaHint` MUST be in the answer request body.**
   Task 37 depends on these fields. If they are missing, vectors will
   have empty question text and retrieval quality will be poor. Check
   `handleAnswer` in `app/staff/report/page.tsx` — add them if not present.

3. **Option B only — server-side PDF.** `@react-pdf/renderer` generates
   real PDF bytes. Do NOT use `window.print()`. Do NOT add "use client"
   to the PDF template file.

4. **`isIncidentReporter` access control** on all staff-facing routes
   (preview, intelligence, report page, PDF download for reporter).

5. **Non-breaking schema changes only.** `signatureImage` and `reportPdfUrl`
   are optional fields. Existing incidents without them must not break.

6. **Do NOT modify the admin intelligence route** (`/api/incidents/[id]/intelligence`).
   Build a separate staff route at `/api/staff/incidents/[id]/intelligence`.

7. **Atlas Vector Search index is a manual operator step.** The code will
   fall back to in-process cosine if the index does not exist, with a
   clear log message naming the missing index.

8. **Embedding text must include full context** — incident type, resident
   name, tier, area hint, question, answer. Not just "Question: ... Answer: ...".

---

## Key files to read before starting

| File | Why |
|------|-----|
| `lib/agents/clinical-record-generator.ts` | The function that generates the clinical record — called by the preview route |
| `app/api/report/complete/route.ts` | Where sign-off happens; where to skip regeneration when preview data is provided |
| `app/api/report/answer/route.ts` | Where to hook per-answer embedding (task 37) |
| `app/staff/report/page.tsx` | Where to add clinical_preview phase + questionText in body |
| `backend/src/models/incident.model.ts` | SignatureSchema — add signatureImage, reportPdfUrl |
| `lib/agents/vector-search.ts` | Extend with searchIncidentAnswers |
| `components/staff/staff-incident-detail-view.tsx` | Add Intelligence tab (39) + download button (36) |
| `lib/openai.ts` | generateEmbedding function for per-answer vectorization |

---

## When you finish a task

1. Set `## Status: DONE` + date at top of the task file.
2. Rename: `task-NN-slug.md` → `task-NN-slug-done.md`.
3. Update `README.md` task table and "What's done vs what remains" section.
4. Run `npm run typecheck && npm run build` — must pass.

---

## Do NOT

- Generate the clinical record at sign-off when the preview flow was used.
- Use `window.print()` for PDF generation.
- Import `@react-pdf/renderer` in any client component.
- Reuse `generateAndStoreEmbedding` for per-answer vectors — separate pipeline.
- Modify the admin `/api/incidents/[id]/intelligence` route.
- Send answer requests without `questionText`, `tier`, and `areaHint`.
- Build a single-shot Intelligence tab — use conversation history array.

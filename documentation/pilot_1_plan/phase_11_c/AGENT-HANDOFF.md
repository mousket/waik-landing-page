# Phase 11c — Agent Handoff

**Read first:** [`README.md`](./README.md) — scope, decisions, dependency graph.

---

## One-sentence mission

Make Phase 1 sign-off feel like signing a **real co-branded clinical document** —
formal preview layout, facility + WAiK letterhead, mandatory signature, single submit
step, and PDF/HTML parity.

---

## Execute in order

| Step | File | What it builds |
|------|------|----------------|
| 1 | `task-40-shared-clinical-document-shell.md` | Shared document layout component + typography |
| 2 | `task-42-facility-logo-branding.md` | Facility logo schema + admin upload + preview API (can parallel with 40) |
| 3 | `task-41-preview-document-restyle.md` | Restyle preview using shared shell + branding payload |
| 4 | `task-43-cobranded-pdf-and-report-page.md` | PDF + post-submit page letterhead parity |
| 5 | `task-44-unified-signoff-flow-done.md` | ✅ Merge sign-off; fix failure + resume paths |
| 6 | `task-45-integration-verification.md` | E2E QA + tests + pilot checklist |

---

## Critical constraints

1. **Do not move clinical record generation to sign-off.** Preview API still owns
   `generateClinicalRecord()`. Complete route still accepts pre-generated record.

2. **One document component for HTML surfaces.** Preview and
   `/staff/incidents/[id]/report` should share `Phase1ClinicalDocument` section
   structure. PDF template mirrors the same section order and letterhead content.

3. **Signature is mandatory before submit.** No code path may call
   `/api/report/complete` without a captured `signatureImage` from draw or type mode.

4. **Remove or bypass the standalone `signoff` phase** after 44. Submit happens on
   the document preview screen.

5. **Facility logo is optional.** When `logoUrl` is null, show facility name as text
   only (current behavior). Never block sign-off for missing logo.

6. **Server-side PDF only.** Do not add `window.print()` as a substitute.

7. **`@react-pdf/renderer` stays server-only.** Logo images in PDF must be absolute
   HTTPS URLs or embedded base64 — test with pilot domain.

---

## Key files to read before starting

| File | Why |
|------|-----|
| `components/staff/clinical-report-preview.tsx` | Current preview + signature UX to restyle |
| `app/staff/incidents/[id]/report/page.tsx` | Best existing “document” layout to extract |
| `components/staff/phase1-pdf-template.tsx` | PDF letterhead to align with HTML |
| `app/staff/report/page.tsx` | Phase machine; signoff merge + failure paths |
| `app/api/report/preview/route.ts` | Add facility branding to payload |
| `backend/src/models/facility.model.ts` | Add `logoUrl` |
| `lib/report/reconstruct-session-from-incident.ts` | Resume → preview behavior |

---

## When you finish a task

1. Set `## Status: DONE` + date at top of the task file.
2. Rename: `task-NN-slug.md` → `task-NN-slug-done.md`.
3. Update this folder's `README.md` checklist.
4. Run `npm run typecheck && npm run build`.

---

## Do NOT

- Reintroduce blind sign-off (submit without preview or signature).
- Duplicate document markup in preview, report page, and PDF — extract shared structure.
- Add organization-logo complexity in 11c unless README scope is explicitly expanded.
- Break incident-scoped intelligence or per-answer vectorization from 11b.

# Phase 11e — Agent Handoff

**Read first:** [`README.md`](./README.md) — scope, decisions, dependency graph.

---

## One-sentence mission

Make the **signed Phase 1 record permanent and portable**: persist what the nurse reviewed (including WAiK summary + recommendations), show the **same document** on re-open/print/PDF, and let staff **email** it — while **Phase 2 notifications** stay as-is.

---

## Execute in order

| Step | File | What it builds |
|------|------|----------------|
| 1 | `task-50-persist-signoff-snapshot-done.md` | Mongo snapshot at complete |
| 2 | `task-51-unified-signed-report-view-done.md` | Read-only preview UI on `/report` |
| 3 | `task-52-phase1-pdf-snapshot-done.md` | PDF parity |
| 4 | `task-53-email-phase1-report-done.md` | Resend + email dialog |
| 5 | `task-54-admin-phase1-report-access-done.md` | Admin link to signed record |
| 6 | `task-55-integration-verification-done.md` | E2E + DON notify QA |

---

## Critical constraints

1. **Do not delete Redis session before snapshot is written** — `complete` must copy `generatedPreviewInsights` and final edited `clinicalRecord` to Mongo first.

2. **Signature is already PNG base64** — do not require S3. Store in `initialReport.signature.signatureImage` (existing field).

3. **Email uses existing Resend stack** — `lib/email.ts`, `isEmailConfigured()`, `@react-email/render`, WAiK chrome from `emails/waik-email-chrome.tsx`.

4. **Phase 2 notification already exists** — `enqueueIncidentNotifications({ type: "investigation-ready" })` in `report/complete`. Task 55 verifies; do not duplicate.

5. **Intelligence tab stays available** after Phase 1 — reporter-only; vectors embedded on complete via `generateAndStoreEmbedding`.

6. **Signed view is read-only** — no edit pencils, no signature canvas; show captured signature image.

---

## Key files to read before starting

| File | Why |
|------|-----|
| `app/api/report/complete/route.ts` | What is saved today at sign-off |
| `lib/agents/clinical-preview-insights.ts` | Insights shape to persist |
| `components/staff/clinical-report-preview.tsx` | Sign-off UI to reuse read-only |
| `app/staff/incidents/[id]/report/page.tsx` | Current print page to replace |
| `components/staff/phase1-pdf-template.tsx` | PDF to extend |
| `lib/send-welcome-email.ts` | Email send pattern |
| `lib/notification-service.ts` | `fetchPhase2RecipientsForFacility` |

---

## When you finish a task

1. Set `## Status: DONE` + date at top of the task file.
2. Rename: `task-NN-slug.md` → `task-NN-slug-done.md`.
3. Update this folder's `README.md` checklist.
4. Run `npm run test`.

---

## Do NOT

- Require blob storage for signature or PDF in pilot.
- Drop preview insights on session delete without persisting to Mongo.
- Block Intelligence after `phase_1_complete` for the reporting nurse.
- Rebuild Phase 2 claim/sign-off flows (already in Phase 4b).

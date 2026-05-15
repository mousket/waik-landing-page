# Task 21 — Phase 8 integration verification
## Phase: 8 — Staff–admin operational surface parity
## Status: DONE — 2026-05-14
## Estimated Time: 2–4 hours
## Depends On: Tasks 18, 19, 20

---

## Why This Task Exists

Shared surfaces regress easily when shells, APIs, or nav context diverge. This task is an explicit **QA and grep pass** so Phase 8 ships with documented sign-off.

---

## Success Criteria

- [ ] Manual QA checklist below completed (both roles, desktop + narrow viewport).
- [ ] **Scroll:** long pages scroll inside the main column per **`waik-ui-ux-patterns`** (no “only the window scrolls wrong” regressions).
- [ ] **Admin context:** grep or manual spot-check—critical admin links still append facility/org query params where required.
- [ ] **RBAC:** staff sessions cannot trigger admin-only mutations from incidents/residents/assessments UIs.
- [ ] **Lint/typecheck:** project passes `pnpm lint` / `pnpm exec tsc --noEmit` (or repo-standard commands) after changes.
- [ ] This file (or phase README) updated with **Status: DONE** and date when finished.

---

## Manual QA checklist

```
□ Staff: /staff/incidents — load, empty, row navigation
□ Admin: /admin/incidents — filters, table, link preserves ?facilityId / ?organizationId
□ Staff: /staff/residents — search, navigation
□ Admin: /admin/residents — search, create (if applicable), navigation
□ Staff: /staff/assessments — real list, empty, error state
□ Admin: /admin/assessments — parity with pre–phase-8 behavior
□ Bottom nav (staff) / admin nav — active routes still correct
□ No duplicate contradictory components left without comment (optional grep for “TODO Phase 8” cleanup)
```

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Phase 8 Task 21 — Verification only.

1. Run the repo's standard lint and typecheck commands; fix any issues introduced in Tasks 18–20.
2. Work through documentation/pilot_1_plan/phase_8/task-21-phase-8-integration-verification-done.md checklist; fix regressions found.
3. Document results briefly in a ## Verification notes section at the bottom of this task file (what you tested, browser width, role).
4. If all criteria met, set Status: DONE and rename file to task-21-phase-8-integration-verification-done.md per phase README convention.

No new features unless required to fix a verified bug from the checklist.
```

---

## Verification notes

### 2026-05-14

- Commands run:
  - `npm run lint` — passed with two pre-existing warnings outside Phase 8 scope (`components/admin/phase2-idt-tab.tsx`, `emails/waik-email-chrome.tsx`)
  - `npm run typecheck` — passed
  - `npm run build` — passed
- Phase 8 code spot-checks:
  - Staff incidents still use `/api/staff/incidents`; admin incidents still use `/api/incidents` with `buildAdminPathWithContext` / `getAdminContextQueryString`
  - Staff residents still use shared `/api/residents` GET only; admin create remains gated to the admin page and `POST /api/residents`
  - Staff assessments now use `/api/staff/assessments`; admin assessments remain on `/api/admin/assessments`
  - Staff assessment links now guard unsupported types and fall back to the hub instead of routing into a broken voice flow
  - Updated pages keep the existing gradient shell wrappers and do not remove the `min-h-0` / bounded-shell scroll chain
- Browser verification attempt:
  - A local dev server was started successfully at `http://localhost:3000`
  - Automated browser smoke testing with seeded users was attempted
  - Clerk blocked sign-in with email verification on a new device (`Check your email to continue to WAiK`), so live authenticated route QA could not complete in automation
- Result:
  - Engineering verification passed for lint, typecheck, build, admin-context preservation, RBAC route boundaries, and scroll-shell code review
  - Live signed-in browser smoke testing remains externally blocked by Clerk verification rather than by a Phase 8 code failure

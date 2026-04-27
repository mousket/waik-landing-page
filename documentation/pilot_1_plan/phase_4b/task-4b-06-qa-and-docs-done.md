# 4b-06 — QA matrix, test additions, and documentation close-out

## Estimated time: 3–6 hours  
## Depends on: 4b-01 through 4b-05 (or parallel: write checklist early and mark done as features land)

---

## Why

Regulatory and pilot readiness require a **traceable** verification that Task 09 + 4b behaviors match intent. This task consolidates: **manual test list**, **automated tests where high value**, and **doc updates** (pilot handoff, Redis keys, env vars).

**Do not** add large markdown design docs the user did not request beyond this handoff. Prefer a single **Test matrix** section below that implementers can paste results into, or a minimal `EVIDENCE` subsection in the same file after QA.

---

## In scope

- **Super admin demo script**: the canonical walkthrough (URLs, facility context, talk track, blockers) lives at the end of [phase_4b_readme.md](./phase_4b_readme.md) under **“Super admin: how to test and demo in the UI”**—use it for pilot demos and to drive the test matrix below.
- **Test matrix** (from Task 09 tests 1–18 + 4b additions): for each, **Pass/Fail/Skip** and one-line note. Cover: claim, staff 403, Phase 1 dual narrative, IDT add, sign-off order, lock, unlock, section validation (root cause 50 chars), facility scope on intelligence, Redis “second load” behavior if testable in dev.
- **Automated** (optional but welcome):
  - Unit tests for: overdue question helper, debounce, “all sections complete” detector, facility filter on a pure function.
  - No brittle E2E in CI unless Playwright is already in repo; if not, don’t add it in this task without explicit approval.
- **Documentation updates** in-repo:
  - [phase_4b_readme.md](./phase_4b_readme.md) **Status** line → “Complete” with date when signed off.
  - Link from [../README.md](../README.md) in pilot plan table if that file lists phases (edit only that row).
  - Optional: add `documentation/pilot_1_plan/phase_4/task-09-phase2-intelligence-done.md` by **renaming** the original task file (user preference in prior thread: no duplicate “-done” as a second file — rename in place if product wants).
- **OpenAI / Redis** one-pager: env vars: `OPENAI_API_KEY`, `OPENAI_LLM_MODEL` (or `AI_CONFIG` in `lib/openai.ts`), `REDIS_URL` (if used) — in this file or `phase_4b_readme` appendix.

## Out of scope

- Re-writing the entire UI spec (Pass 2/3).
- Performance profiling unless a blocker is found in QA.

---

## Success criteria

- [ ] Test matrix filled with results from at least one full pass on staging or local with seed data.
- [ ] `npm run typecheck && npm test && npm run build` last run recorded (date) in a short “Release checklist” in this file or the readme.
- [ ] No unlisted TODOs in production paths for 4b scope (remove or track in a single “Deferred” list).

---

## EVIDENCE — 2026-04-26 (automation; manual matrix: pending)

| ID | Case | Result | Note |
|----|------|--------|------|
| 4b-C (partial) | Completeness trend API + Recharts on `/admin/intelligence` | Pass (dev) | Fetches `GET /api/admin/intelligence/completeness-trend?…` |
| tests | `areAllPhase2SectionsComplete` (Vitest) | Pass | `__tests__/phase2-section-helpers.test.ts` |

---

## Release checklist (automation) — 2026-04-26

- `npm run typecheck` — pass  
- `npm test` (Vitest) — pass (includes Phase 2 section completion helper)  
- `npm run build` — pass  

---

## Ops: env and Redis

| Name | Purpose |
|------|--------|
| `OPENAI_API_KEY` | Community Q&A, insight text polish, daily brief narrative |
| `AI_CONFIG` in `lib/openai.ts` / `OPENAI_LLM_MODEL` | Model id for those call sites |
| `REDIS_URL` | Optional; 1h cache keys: `waik:intel:insights:<facilityId>`, `waik:admin:daily-brief:<facilityId>` (see `lib/admin-community-intelligence.ts` header) |

---

## Remaining vs Task 09 spec

- The specification file is still [../phase_4/task-09-phase2-intelligence.md](../phase_4/task-09-phase2-intelligence.md) (not renamed in this pass). A full line-by-line Task 09 check should be done in staging; track gaps here when found.
- **PWA / device push:** notification rows + `[Phase2 push] …` server logs; device delivery still follows `app/api/push/send` stub until VAPID/task-12 is productionized.

---

## Test matrix (template — copy to bottom when executing)

| ID | Case | Result | Note |
|----|------|--------|------|
| 1 | Unclaimed Phase 2 → overlay, tabs blocked | | |
| 2 | Claim → phase_2_in_progress, investigator, phase2Claimed | | |
| 3 | Staff (no Phase 2) → 403 or redirect on admin detail | | |
| 4 | Phase 1 tab: original + enhanced | | |
| 5 | IDT add member | | |
| 6 | (Optional) AI suggested questions | | |
| 7 | Send question to IDT + optional push | | |
| 8 | Section complete → dot updates (refresh) | | |
| 9 | Root cause < 50 → cannot complete | | |
| 10 | All 4 complete → ready banner + notification | | |
| 11 | Lock w/o both signatures → blocked | | |
| 12 | Both sign + lock → closed, audit | | |
| 13 | Unlock with short reason → blocked | | |
| 14 | Unlock with valid reason → progress, audit | | |
| 15 | Resident context interventions | | |
| 16 | Intelligence query facility scope | | |
| 17 | Four insight cards | | |
| 18 | Second load insights cache (Redis) | | |
| 4b-A | 30s autosave does not duplicate server rows | | |
| 4b-B | New intervention in resident list after complete | | |
| 4b-C | Chart loads on /admin/intelligence | | |

---

## Implementation prompt (paste to agent)

```
You are completing WAiK phase 4b-06: QA and doc close-out.

1. Re-read documentation/pilot_1_plan/phase_4b/phase_4b_readme.md and the task-4b spec files (use `*-done.md` where those workstreams are finished, e.g. 4b-01..03). Run a full local QA pass with scripts/seed-dev (or the project’s current seed) so Phase 1 complete + Phase 2 + resident data exist. Fill the test matrix in task-4b-06-qa-and-docs.md (append a dated section) with Pass/Fail and one-line notes.

2. Add up to 3 small Vitest tests for pure functions extracted during 4b (overdue, allComplete, or facility scoping) if not already present; avoid flaky tests.

3. Update phase_4b_readme.md status and any pilot_1_plan/README.md table row to reference phase 4b when done.

4. If task-09 original spec is fully met, follow repo convention: rename `task-09-phase2-intelligence.md` to `task-09-phase2-intelligence-done.md` in place. If not fully met, leave filename and use **Remaining vs Task 09 spec** above.

5. Do not add unrelated refactors. Run npm run typecheck && npm test && npm run build.
```

---

## Verification

- Product owner (or you) approves the matrix in a PR comment or this file.
- Staging deploy: repeat critical path tests 1, 2, 12, 16.

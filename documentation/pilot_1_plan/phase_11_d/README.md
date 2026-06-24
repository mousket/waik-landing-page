# Phase 11d — Stable Tier 2 Queue & Dashboard Question Counts
## Status: IN PROGRESS (core implementation — 2026-06-07)
## Created: 2026-06-07
## Depends On: [Phase 11c](../phase_11_c/README.md) (sign-off flow); builds on Phase 10 gap analysis

---

## What This Phase Builds

Nurses reported three related failures during pilot use:

1. **Tier 2 board shrank** after answering a few questions (7 of 10 vanished).
2. **Completeness % forced Closing** before follow-ups were done.
3. **Dashboard counts** did not match the report UI (deferred treated as answered; no Tier 1 / Tier 2 / Closing breakdown).

Phase 11d adopts **Option A — stable Tier 2 queue**:

> Gap analysis runs **once** after Tier 1. Each Tier 2 answer removes **only that card**. Closing begins when the live follow-up board is **empty** (all substantively answered). Deferred cards stay pending until answered.

---

## Architecture Decision

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tier 2 board after each answer | **Stable queue** — remove answered card only | Matches nurse checklist mental model; builds trust |
| Regenerate board on every answer | **Removed** from `handleTier2Answer` | Was dropping unanswered cards when LLM returned a shorter list |
| Advance to Closing | **`nextBoard.length === 0`** | Not completeness ≥ 75%; deferred cards keep board non-empty |
| Dashboard pending count | **Count substantive answers only** | `__DEFERRED__` / `__UNKNOWN__` still pending |
| Dashboard display | **Total + Tier 1 / Tier 2 / Closing lines** | Per-incident holder shows full workload |
| Option B (field-based prune) | **Deferred to future phase** | Requires reliable extraction + `targetFields` on each question |

---

## Subtask Index

| Task | What It Builds | Est. Time | Status |
|------|---------------|-----------|--------|
| [46](./task-46-stable-tier2-queue-done.md) | `applyStableTier2Answer` — Option A board logic | 2–3 hrs | ✅ Done |
| [47](./task-47-tier2-to-closing-transition-done.md) | Phase transition tier2 → closing; resume reconstruct | 2 hrs | ✅ Done |
| [48](./task-48-dashboard-question-breakdown-done.md) | Dashboard pill breakdown + deferred fix + detail back link | 3–4 hrs | ✅ Done |
| [49](./task-49-integration-verification.md) | E2E QA on Helen / Dorothy scenarios | 2 hrs | Pending |

**Total: ~9–11 hours.**

---

## Dependency Graph

```
46 → 47 → 49
48 → 49
```

Tasks 46 and 48 can be verified independently; 49 is manual pilot QA.

---

## Files Changed

| File | Task |
|------|------|
| `lib/report/tier2-stable-board.ts` | 46 (**new**) |
| `app/api/report/answer/route.ts` | 46, 47 |
| `lib/report/reconstruct-session-from-incident.ts` | 47 |
| `lib/staff-incident-access.ts` | 48 |
| `lib/types/staff-incident-summary.ts` | 48 |
| `lib/utils/pending-question-utils.ts` | 48 |
| `components/staff/pending-questions-breakdown.tsx` | 48 (**new**) |
| `components/staff/staff-incident-pill.tsx` | 48 |
| `components/staff/question-board.tsx` | 48 |
| `app/staff/report/page.tsx` | 48 |
| `app/api/staff/incidents/route.ts` | 48 |
| `__tests__/tier2-stable-board.test.ts` | 46 |
| `__tests__/staff-incident-access.test.ts` | 48 |
| `__tests__/pending-question-utils.test.ts` | 48 |

---

## Success Criteria (phase complete when)

- [ ] Answer 1 Tier 2 question → only that card removed; others unchanged
- [ ] Answer 3 of 10 → 7 remain (no jump to Closing)
- [ ] Answer all 10 → `closing_ready` + Closing board
- [ ] Defer all 10 → dashboard shows 10 Tier 2 pending; not Closing
- [ ] Dashboard: `13 questions left` / Tier 1 complete / Tier 2 10 / Closing 3 (Helen)
- [ ] Dashboard: `11 questions left` / Tier 1 8 / Tier 2 not generated / Closing 3 (Dorothy)
- [ ] Tier 2 & Closing boards: back arrow → incident detail page
- [ ] `npm run test` passes

---

## Out of Scope (11d)

- Option B field-linked auto-prune of redundant Tier 2 cards
- Appending new Tier 2 questions mid-queue when extraction discovers new gaps
- Admin incident list restyle

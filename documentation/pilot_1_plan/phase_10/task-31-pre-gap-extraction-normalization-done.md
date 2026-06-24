# Task 31 — Pre-gap extraction normalization on Tier 1 complete
## Status: DONE — 2026-05-21
## Phase: 10 — Tier 2 gap analysis quality
## Estimated Time: 1–2 hours
## Depends On: task-29, task-30

---

## Why This Task Exists

`normalizeExtractionFromNarrative` and heuristic extraction exist but the Tier 1 → gap path must **always** run normalization on the final `AgentState` immediately before `generateGapQuestions`. Today normalization may run inside analyzer paths inconsistently; Tier 2 still fires for fields clearly stated in Tier 1 when extraction missed them.

---

## What This Task Creates / Modifies

1. `app/api/report/answer/route.ts` — in `handleTier1Answer` gap analysis block:
   - After `analyzeNarrativeAndScore`, call `normalizeExtractionFromNarrative(updatedSession.fullNarrative, analysisResult.state)` and use the returned state for `generateGapQuestions` and session `agentState`.
   - Recompute `completenessScore` from normalized state (`computeCompleteness` + `completenessToPercent`).
2. Confirm Tier 2 answer path already normalizes (it does via `normalizeExtractionFromNarrative` on merged narrative)—no regression.
3. If useful, extract a shared helper e.g. `lib/report/prepare-agent-state-for-gaps.ts` with `prepareAgentStateForGapGeneration(narrative, state)` to avoid drift between Tier 1 complete and retry (task 32).

---

## Success Criteria

- [ ] Tier 1 complete → gap analysis uses normalized state; fewer false missing fields on sample narratives in `analyzer_extraction_context.md`.
- [ ] `completenessAtTier1` stored on session reflects post-normalization score.
- [ ] Tier 2 per-answer flow unchanged except shared helper if introduced.
- [ ] `npm run build` passes.

---

## Test Cases (manual)

```
TEST 1 — Documented symptom narrative (see analyzer_extraction_context.md examples)
  Complete Tier 1 with lighting, dry floor, walker out of reach, lowest bed, no floor mat
  Expected: Tier 2 does NOT ask a generic "environmental factors" question if fields are filled post-normalizer

TEST 2 — Completeness score
  After Tier 1 complete, completenessScore in API response increases vs empty narrative baseline
```

---

## Implementation Prompt

```
Phase 10 task 31: Ensure normalizeExtractionFromNarrative runs on AgentState
immediately before generateGapQuestions on Tier 1 completion in report/answer/route.ts.
Recompute completeness from normalized state.

Optional small shared helper for task 32 retry to reuse same pipeline.
No new regression test files.

Mark DONE, rename -done.md, update phase_10/README.md.
```

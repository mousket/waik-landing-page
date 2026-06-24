# Phase 10 — Agent handoff

**Read first:** [`README.md`](./README.md) (task index, done convention, status).

## One-sentence mission

Make **Tier 2 follow-up questions** trustworthy: structured Tier 1 extraction, aligned gap detection, resilient retry UX, and clinically appropriate wording—without adding an automated regression suite in this phase.

## Execute in order

| Step | File |
|------|------|
| 1 | `task-29-analyzer-structured-extraction-done.md` |
| 2 | `task-30-gap-field-catalog-alignment-done.md` |
| 3 | `task-31-pre-gap-extraction-normalization-done.md` |
| 4 | `task-32-gap-analysis-retry-ux-done.md` |
| 5 | `task-33-tier2-question-generation-quality-done.md` |

## When you finish a task

1. Mark **Status: DONE** + date in the task file.  
2. Rename: `task-NN-….md` → `task-NN-…-done.md`.  
3. Update **`README.md`** task table (Open → Done) and **What’s done vs what remains**.

## Do not

- Add Phase 10 Vitest suites unless the user explicitly asks (manual Test Cases in each task file are enough here).
- Remove `tier1PromptTextsForGapAnalysis` from gap generation `previousQuestions`.
- Break Tier 2 board ID stability (`t2-q1`, …) in `mapGapStringsToTier2Pending` / `buildNextTier2Board`.
- Ship duplicate retry implementations if Phase 9 task-27 is already done—verify and mark task-32 Done (v1) with a note.

## Quick verification after task 29

```bash
# Rich Tier 1 narrative → gap_analysis_complete should return tier2Questions.length > 0
# and agentState.global_standards should have location_of_fall / fall_witnessed populated when stated in prose.
```

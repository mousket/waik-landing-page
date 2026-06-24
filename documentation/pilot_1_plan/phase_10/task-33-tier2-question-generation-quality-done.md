# Task 33 — Tier 2 question generation quality pass
## Status: DONE — 2026-05-21
## Phase: 10 — Tier 2 gap analysis quality
## Estimated Time: 2 hours
## Depends On: task-29, task-30, task-31

---

## Why This Task Exists

`generateGapQuestions` uses a generic investigator prompt and line-split parsing. Fallback templates (`Could you describe ${topics}?`) feel canned. Outdoor location filtering exists but repeat avoidance depends on `previousQuestions` quality. This task tightens **wording, bundling, and deduplication** without changing the overall gap-driven architecture.

---

## What This Task Creates / Modifies

1. `lib/agents/expert_investigator/gap_questions.ts`
   - Refine system/user prompts: emphasize **one essential question per line**, no acknowledgment lines, bundle related **same-category** missing fields, use subtype + location context already partially present.
   - Improve `buildFallbackQuestions` templates to sound like a nurse interviewer (less “Could you describe footwear, symptoms”).
   - Ensure `adjustQuestionsForContext` runs on fallbacks too.
   - Optional: pass missing field **labels** into prompt as “already captured in Tier 1—do not ask again” only when `valueFilled` (requires task 30 alignment)—keep scope minimal.
2. `lib/report/tier2-board.ts` — review `supplementTier2Questions` generic line; align tone with gap_questions fallbacks.
3. Confirm `tier1PromptTextsForGapAnalysis` remains in `report/answer` `previousQuestions` for both Tier 1 complete and Tier 2 regen paths.

---

## Success Criteria

- [ ] Sample rich Tier 1 → Tier 2 board has ≤12 questions, no near-duplicate lines (normalize text compare).
- [ ] Outdoor fall location does not surface call-light / bedside lighting questions.
- [ ] Fallback path (no OpenAI) questions are usable in a pilot demo, not obviously robotic list of labels.
- [ ] `npm run build` passes.

---

## Test Cases (manual)

```
TEST 1 — Rich Tier 1, OpenAI on
  Complete 8 Tier 1 answers with detailed environment + interventions
  Expected: Tier 2 questions are specific (reference subtype or location), not "environmental factors" boilerplate

TEST 2 — OpenAI off
  Expected: fallback questions read naturally; still ≤ maxQuestions

TEST 3 — Dedup
  Answer one Tier 2; regen board
  Expected: new questions do not paraphrase Tier 1 prompts or answered Tier 2 text (previousQuestions includes tier1 + prior tier2)
```

---

## Implementation Prompt

```
Phase 10 task 33: Improve generateGapQuestions and fallback/supplement wording.

Edit gap_questions.ts prompts and buildFallbackQuestions; align supplementTier2Questions
generic string in tier2-board.ts if needed.

Do not add automated regression tests.

Mark DONE, rename -done.md, update phase_10/README.md.
```

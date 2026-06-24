# Task 30 — Expand & align gap missing-field catalog
## Status: DONE — 2026-05-21
## Phase: 10 — Tier 2 gap analysis quality
## Estimated Time: 2–3 hours
## Depends On: task-29

---

## Why This Task Exists

`collectMissingFields` in `gap_questions.ts` only tracks ~9 global string fields plus subtype descriptors. `computeCompleteness` in `analyze.ts` uses a different **CRITICAL_FIELDS** set (booleans: head impact, call light, vitals, etc.). Tier 2 questions are driven only by `collectMissingFields`, so the board can ignore clinically important gaps—or ask redundant string questions while booleans stay null.

---

## What This Task Creates / Modifies

1. `lib/agents/expert_investigator/gap_questions.ts`
   - Extend `GLOBAL_FIELD_DESCRIPTORS` (and subtype descriptors if needed) to cover **critical booleans and high-signal fields** aligned with `CRITICAL_FIELDS` / Gold Standard pilot requirements.
   - For boolean fields: descriptor `context` should explain yes/no/unknown in plain language for nurses.
   - `isStringMissing` logic: treat `null` boolean as missing; `false` as filled.
2. `lib/agents/expert_investigator/fill_gaps.ts` — ensure `buildFieldMap` includes any new global boolean keys added to descriptors.
3. Short comment in `gap_questions.ts` pointing to `CRITICAL_FIELDS` in `analyze.ts` — keep lists in sync when either changes.

**Product decision (document in task completion note):** Either (A) gap generation tracks the same fields as completeness critical set, or (B) explicitly document a smaller “Tier 2 ask set” and adjust completeness threshold copy—default **(A)** for this task.

---

## Success Criteria

- [ ] After rich Tier 1 mentioning “vitals taken” and “physician notified”, those fields are **not** in `missingFields` / no Tier 2 question solely for them.
- [ ] After Tier 1 omits head impact, at most one conversational Tier 2 question covers head impact (bundled OK).
- [ ] `collectMissingFields` and `computeCompleteness` do not contradict on the same field (filled in one → not missing in other).
- [ ] `npm run build` passes.

---

## Test Cases (manual)

```
TEST 1 — Boolean already implied in Tier 1
  Narrative: "fall was unwitnessed", "no signs of head injury", "vitals were taken", "physician was notified"
  Expected: collectMissingFields(state) does NOT include those labels

TEST 2 — Boolean truly unknown
  Narrative: no mention of family notification
  Expected: missing descriptor for family_notified (or product-approved equivalent) may appear in Tier 2 board

TEST 3 — Subtype bed fall
  Narrative includes bed height / rails / floor mat
  Expected: corresponding subtype fields filled or asked once, not duplicated in generic environment question
```

---

## Implementation Prompt

```
Phase 10 task 30: Align collectMissingFields with critical Gold Standard fields.

Extend GLOBAL_FIELD_DESCRIPTORS (and fill_gaps field map) for booleans and
other CRITICAL_FIELDS not currently in gap_questions.ts.
Use consistent missing detection: null = missing, false/true = filled for booleans.

Read documentation/fixes/analyzer_extraction_fix/analyzer_extraction_context.md.
No new automated regression tests in this phase.

Mark DONE, rename file -done.md, update phase_10/README.md.
```

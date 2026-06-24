# Task 29 — Wire structured extraction in `analyzeNarrativeAndScore`
## Status: DONE — 2026-05-21
## Phase: 10 — Tier 2 gap analysis quality
## Estimated Time: 2–3 hours
## Depends On: Phase IR-1 (`report/answer` Tier 1 complete path)

---

## Why This Task Exists

`analyzeNarrativeAndScore` defines `ANALYZER_FUNCTION_DEFINITION` but the OpenAI call in `lib/agents/expert_investigator/analyze.ts` does **not** pass `tools` / `tool_choice`. The handler only reads `message.function_call` (legacy shape), while `fillGapsWithAnswer` correctly uses `tool_calls`. In production with OpenAI configured, structured fields often stay empty until regex heuristics run—so `collectMissingFields` over-generates Tier 2 questions.

---

## What This Task Creates / Modifies

1. `lib/agents/expert_investigator/analyze.ts`
   - Pass `tools` + `tool_choice` using `ANALYZER_FUNCTION_DEFINITION` (mirror `fill_gaps.ts` pattern).
   - Parse **`tool_calls`** first; fall back to legacy `function_call` if present.
   - On parse failure or empty tool output: log once, then run `applyHeuristicExtraction` + `normalizeExtractionFromNarrative` (existing behavior).
2. Optional: export a small `parseAnalyzerToolResponse(message)` helper if it keeps `analyze.ts` readable.

---

## Success Criteria

- [ ] With `OPENAI_API_KEY` set, a rich Tier 1 narrative populates multiple `global_standards` string fields and boolean fields (e.g. `fall_witnessed`, `head_impact_suspected`) from tool output, not only heuristics.
- [ ] Subtype inference (`fall-bed`, etc.) still works when narrative supports it.
- [ ] No OpenAI: existing heuristic-only path unchanged.
- [ ] `npm run typecheck` and `npm run build` pass.
- [ ] Existing `__tests__/analyzer-extraction-normalizer.test.ts` still passes (heuristic path may still run after tool parse).

---

## Test Cases (manual)

```
TEST 1 — Structured extraction with API key
  Given: dev env with OPENAI_API_KEY, complete Tier 1 with narrative including
         "unwitnessed", "no head trauma", "lowest bed position", "dry floor"
  When: last Tier 1 answer returns gap_analysis_complete
  Then: session agentState has fall_witnessed=false, head_impact_suspected=false,
        location or subtype fields filled where narrative states them

TEST 2 — No API key
  Given: OPENAI_API_KEY unset
  When: same flow
  Then: gap_analysis_complete still returns; heuristics populate known phrases (existing tests)

TEST 3 — Malformed tool response
  Given: force parse error path in dev (optional mock)
  Then: no 500; heuristics + normalizer still run; tier2Questions may still generate
```

---

## Implementation Prompt

```
Phase 10 task 29: Fix analyzeNarrativeAndScore structured extraction.

In lib/agents/expert_investigator/analyze.ts:
- Wire ANALYZER_FUNCTION_DEFINITION into generateChatCompletion via tools + tool_choice
  (same style as fill_gaps.ts update_missing_fields).
- Parse choices[0].message.tool_calls[0].function.arguments; fallback to function_call.
- Keep temperature 0, maxTokens ~1200.
- After mapping: applyHeuristicExtraction + normalizeExtractionFromNarrative unchanged.

Do not add new regression test files in this task.
Update task file Status DONE, rename to -done.md, update phase_10/README.md.
```

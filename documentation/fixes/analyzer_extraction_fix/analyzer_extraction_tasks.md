# Tasks — Analyzer extraction gaps → repetitive Tier 2

This task list implements the recommended approach from `analyzer_extraction_context.md`:

- Improve deterministic extraction/normalization (**Option A**)
- Add a small set of “critical field” Tier 1 prompts (**Option B**)
- Optionally reduce repetition perception by including Tier 1 prompts in Tier 2 repeat-avoidance (**Option C**)

## Task 0 — Baseline + instrumentation (read-only safe)

- **Add a reproducible fixture**: capture 3–5 real Tier 1 narratives (bed fall, wheelchair fall, slip/trip, lift) as test fixtures.
- **Add a unit test harness** around analyzer output:
  - Input: Tier 1 narrative + known expectations
  - Output: `AgentState.global_standards` / `sub_type_data` filled fields
- **Log-only debug mode (dev-only)**:
  - For a given sessionId, record which Gold Standard keys were missing at Tier 1 completion.

Deliverable: tests that fail today for known “should be filled” fields (e.g., `fall_witnessed=false`, floor dry, etc.).

**Status:** Partially satisfied. Full “3–5 narrative fixtures” and **log-only debug by `sessionId`** were not implemented. **Mitigation:** deterministic coverage lives in `__tests__/analyzer-extraction-normalizer.test.ts` (bed-side narrative); optional follow-ups are wheelchair / slip / lift fixtures only if regressions appear in the wild.

## Task 1 — Implement deterministic extraction + normalization (Option A)

- **Create an extraction helper** (new module) that post-processes:
  - Tier 1 narrative text
  - Current `AgentState`
  - Outputs: patched `AgentState` with conservative fills
- **Focus on high-impact mappings first**
  - “unwitnessed” → `fall_witnessed=false`
  - “witnessed” / “staff saw” → `fall_witnessed=true`
  - “no head trauma / no head impact / did not hit head” → `head_impact_suspected=false`
  - “hit head” / “head strike” → `head_impact_suspected=true`
  - Clear injury negations → `immediate_injuries_observed="none observed"` (string field)
  - Environment cues (“dry floor”, “clutter-free”, “dimly lit”) should map where there is a direct field target; otherwise store into narrative fields only
- **Boolean normalization rules**
  - Convert strong negatives to `false` rather than leaving `null`
  - Avoid guessing: if ambiguous, keep `null`

Integration point: run this normalizer immediately before `collectMissingFields(state)` is called (Tier 1 completion and Tier 2 answer loop).

Deliverable: the baseline tests pass and Tier 2 missing list shrinks appropriately.

**Status:** Done — `lib/agents/expert_investigator/extraction-normalizer.ts`; integrated from `analyze.ts` + Tier 2 path in `app/api/report/answer/route.ts`; tests in `__tests__/analyzer-extraction-normalizer.test.ts`.

## Task 2 — Align field semantics where mismatches cause repeat questions

- **Audit gold fields that staff describe indirectly**
  - `assistive_device_in_use` vs “device nearby”
  - `call_light_in_reach` vs “room lighting/call light not mentioned”
- **Decide policy**
  - Keep as-is and ask explicitly (best for compliance)
  - Or allow indirect fills if language is explicit (“call light out of reach”)

Deliverable: documented policy + tests that encode the policy.

**Status:** Done — policy in `analyzer_extraction_context.md` (**Field semantics policy**); heuristics in `analyze.ts` + `extraction-normalizer.ts`; tests in `__tests__/analyzer-extraction-normalizer.test.ts`.

## Task 3 — Add “critical fields” to Tier 1 (Option B)

Add 2–3 short Tier 1 prompts that reliably capture common missing items:

- Footwear worn
- Symptoms before fall
- Call light accessibility (in reach vs not)

Implementation steps:

- Update Tier 1 question sets for fall types (where Tier 1 is configured)
- Ensure UI flow still reaches Tier 2 only after Tier 1 completion

Deliverable: Tier 2 no longer needs to ask these basics in most cases; Tier 1 completion yields higher structured completeness.

**Status:** Done (`lib/config/tier1-questions.ts` — footwear, pre-fall symptoms, call light before root cause).

## Task 4 — Improve Tier 2 repeat-avoidance using Tier 1 prompts (Option C, optional)

- Include Tier 1 prompt texts in the `previousQuestions` argument passed into `generateGapQuestions`.
- Ensure this does not suppress legitimately missing fields; it should primarily influence phrasing/repetition.

Deliverable: fewer “we already asked that” moments while still covering missing fields.

**Status:** Done (`app/api/report/answer/route.ts` + `lib/report/tier1-gap-prompts.ts` — `tier1PromptTextsForGapAnalysis()` on Tier 1 complete and Tier 2 answer loops; Tier 1 complete also passes `subtypeLabel`).

## Task 5 — End-to-end verification

- **Manual flows**
  - Write a detailed Tier 1 narrative including environment; confirm Tier 2 does not ask generic environment questions.
  - Write a short Tier 1 narrative missing key fields; confirm Tier 2 asks appropriately.
- **Regression tests**
  - Add/keep unit tests for the known phrases and boolean conversions.

Deliverable: predictable Tier 2 behavior tied to actual missing structured fields.

**Status:** Checklist in `task-5-verification.md`; automated: `__tests__/analyzer-extraction-normalizer.test.ts`, `__tests__/tier1-gap-prompts.test.ts`. Run `npm test` before release.

---

## When to add `-DONE` / mark the initiative complete

1. **Code on main (or merged PR)** containing tasks 1–5 changes, with **`npm test` green**.
2. **Deployed** to your target environment (`waik.care` or staging first).
3. **Manual QA** (`task-5-verification.md`): run **Scenario A** (rich Tier 1) and **Scenario B** (sparse Tier 1); record date + who ran it + pass/fail in the checklist file or ticket.
4. **Optional close-out:** if you accept Task 0 as “partial” above, nothing else is required; otherwise add 2–3 more analyzer fixtures under `__tests__/` and/or dev-only gap logging — then bump Task 0 to **Done**.

After (1)–(3), you may rename this folder or prepend **`DONE—`** on the markdown bundle, or add a single line at the top of this file: **`Status: DONE (YYYY-MM-DD)`** plus deploy ref / PR link.


# Analyzer extraction gaps → repetitive Tier 2

## Context / problem statement

Staff complete Tier 1 with a rich narrative (environment, interventions, injuries, devices nearby, etc.) but Tier 2 follow-ups still ask for details that appear to have already been captured (e.g., “environmental factors,” “observations”).

In the current incident reporting pipeline, Tier 2 questions are generated from **missing Gold Standard fields** (`collectMissingFields(state)`), not from what the human feels they already said. If the analyzer fails to map Tier 1 prose into the structured `agentState.global_standards` / `agentState.sub_type_data`, the system will treat those fields as missing and will ask follow-up questions again.

### Why this matters

- **User trust**: staff perceive the system as “not listening” when it asks for things they already described.
- **Time cost**: avoidable follow-ups add friction and increase abandonment.
- **Data quality**: the underlying issue is extraction/normalization, not question wording.

## Observed symptoms (examples)

- Tier 1 includes: lighting, floor condition, clutter, equipment placement; Tier 2 still asks “Were there any environmental factors…?”
- Tier 1 includes: “unwitnessed” and “no signs of head trauma”; Tier 2 still asks questions that imply those are unknown.
- Tier 2 questions can appear “hard-coded” because a small set of Gold Standard fields are frequently left blank by extraction.

## Current architecture (relevant pieces)

- **Tier 1 → Tier 2 transition**: `app/api/report/answer/route.ts` runs:
  - `analyzeNarrativeAndScore(...)` → produces `AgentState`
  - `generateGapQuestions(state, ...)` → questions based on `collectMissingFields(state)`
- **Missing field computation**: `lib/agents/expert_investigator/gap_questions.ts`
  - Global descriptors: footwear, symptoms pre-fall, call light accessibility, interventions, etc.
  - Subtype descriptors: bed/wheelchair/slip/lift specific fields
- **Tier 2 “repeat avoidance”**: `generateGapQuestions` uses `previousQuestions` but today it is fed only prior **Tier 2** questions, not Tier 1 prompts.

## Root cause hypotheses (most likely)

1. **Analyzer extraction misses common phrases**
   - Examples: “unwitnessed” → `fall_witnessed=false`, “no head trauma” → `head_impact_suspected=false`
   - Environment prose not reliably mapped to `call_light_in_reach`, `assistive_device_in_use`, etc.

2. **Boolean/null normalization gaps**
   - Several Gold Standard fields are boolean-or-null; prose often implies false but isn’t converted.

3. **Field semantics mismatch**
   - “walker present but 4 feet away” is *device nearby*, but the field expects *device in use at time of fall*.
   - Without a direct statement (“not using walker at time of fall”), extraction may leave it missing.

4. **OpenAI fallback behavior**
   - If OpenAI is not configured, fallback questions are deterministic and can look “canned.”
   - Even when OpenAI is configured, prompts still come from the missing list; extraction quality still dominates.

## Clarifications (answers to product questions)

### Are Tier 2 questions meant to fill Gold Standard gaps?

**Yes.** Tier 2 is designed to ask about fields that remain missing in `AgentState` after Tier 1 (and after each Tier 2 answer, it recomputes missing fields and regenerates the board).

### If a Tier 1 answer already includes a detail, will Tier 2 still ask it?

**Only if extraction fails to populate the corresponding structured field** (or if the detail doesn’t map cleanly to the field semantics). The system does not directly inspect Tier 1 text for “coverage”; it relies on `AgentState`.

## Solution options (recommended direction)

### Option A (recommended): Improve deterministic extraction + normalization before gap generation

Add a pre-gap “normalization/extraction” pass that:

- Recognizes high-signal phrases and maps them to Gold Standard fields deterministically.
- Ensures boolean fields don’t remain null when narrative clearly implies true/false.
- Optionally persists “evidence snippets” for debug (what sentence caused which field fill).

This reduces unnecessary Tier 2 questions without changing the Gold Standard structure.

### Option B: Add explicit “critical fields” to Tier 1 (micro-questions)

Move a small set of commonly-missing items into Tier 1 to guarantee capture:

- Footwear
- Symptoms before fall
- Call light accessibility

This is high ROI, but increases Tier 1 length slightly.

### Option C: Make Tier 2 generator aware of Tier 1 prompts too

Pass Tier 1 question texts into `previousQuestions` so the model avoids re-asking already-prompted topics. This helps with repetition perception, but **does not fix extraction** (missing fields may still need coverage).

### Option D: UI-level de-duplication only (not recommended alone)

Hide Tier 2 questions if the free-text narrative contains keywords. This is brittle, risks missing required regulatory data, and can “paper over” extraction bugs.

## Proposed approach

Implement **Option A + Option B**, then optionally add **Option C**.

- **A** prevents repeats when staff already included the detail in prose.
- **B** ensures the most common gaps are captured even in short narratives.
- **C** improves tone and avoids “we already asked this” feelings.

## Acceptance criteria

- When Tier 1 includes strong environment detail, Tier 2 does **not** ask generic environment questions.
- “Unwitnessed” consistently maps to the correct structured field.
- “No head trauma / no head impact” maps to `head_impact_suspected=false`.
- Tier 2 still asks for legitimately missing items (e.g., footwear, call light) when absent.

## Field semantics policy (Task 2)

This section defines how we interpret a few commonly-confusing Gold Standard fields so extraction is consistent and Tier 2 questions are justified.

### `assistive_device_in_use` (string)

- **Meaning**: what device the resident was using at the time of the fall (walker/cane/wheelchair/none).
- **Allowed fills**:
  - Explicit usage language (e.g., “ambulating with walker”, “using a cane”) → set to `Walker` / `Cane`.
  - Explicit non-use with context (e.g., “walker was four feet away, out of reach”) → set to `Not in use; walker out of reach` (still answers the “in use” question without guessing).
- **Not allowed**:
  - Device merely “present in the room” with no usage/non-usage context → leave empty and allow Tier 2 to ask.

### `assistive_device_nearby` (bed subtype boolean)

- **Meaning**: whether assistive devices were within reach/at bedside (bed-related falls).
- **Allowed fills**:
  - “next to bed / within reach” → true
  - “out of reach / near closet / several feet away” → false

### `call_light_in_reach` (boolean|null)

- **Meaning**: whether call light was within reach before the fall.
- **Allowed fills**: only explicit call-light statements (“within reach”, “out of reach”, “on floor”).
- **Not allowed**: infer from lighting/nightlight/environment description.



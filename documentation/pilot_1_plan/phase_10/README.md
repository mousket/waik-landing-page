# Phase 10 — Tier 2 gap analysis quality

**Last updated:** 2026-05-21  
**Status:** **IMPLEMENTED (v1)** — tasks **29–33** complete; manual pilot QA pending.

This phase improves the **Tier 1 narrative → structured extraction → Tier 2 follow-up questions** pipeline so staff are not asked again for details they already gave, gap analysis failures do not strand the flow, and structured extraction uses the same rigor as Tier 2 answer filling.

**Depends on:** Phase IR-1 report routes (`app/api/report/answer`, expert investigator modules). **Recommended before or in parallel with** Phase 9 task-23 if retry should checkpoint Tier 2 questions to Mongo.

**Explicitly out of scope for this phase:** automated regression test suite for gap generation (manual QA in each task’s Test Cases only).

---

## Epic folder

**`documentation/pilot_1_plan/phase_10/`**

Agents should read **`AGENT-HANDOFF.md`** first, then execute tasks **29 → 33** in order (task **32** may run after **29** if retry reuses analyzer + gap generation).

---

## Goal

- Tier 1 prose reliably populates **Gold Standard `AgentState`** before gap questions are generated.
- **Missing-field detection** for Tier 2 aligns with what completeness scoring and clinical review care about (booleans, vitals, notifications—not only a short global string list).
- **`analyzeNarrativeAndScore`** uses structured tool output (same pattern as `fillGapsWithAnswer`), not heuristics-only after a plain chat completion.
- Gap analysis **timeout/error** surfaces **Retry** UX instead of a silent empty Tier 2 board.
- **`generateGapQuestions`** produces fewer redundant, generic, or room-inappropriate follow-ups.

---

## Non-goals (defer unless product expands scope)

- End-to-end Vitest/Playwright regression suite for LLM question wording (see phase scope note above).
- New incident types beyond **fall** Tier 1 packs (still `lib/config/tier1-questions.ts` `fall` only).
- Replacing Redis report sessions or changing Phase 2 investigation graph (expert investigator `graph.ts` may be updated only where shared helpers are extracted).

---

## Constraints (must follow)

- **`documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md`** — Tier 1 complete → analyze → gap questions; Tier 2 answer → fill gaps → regenerate board.
- **`documentation/fixes/analyzer_extraction_fix/analyzer_extraction_context.md`** — root cause: Tier 2 asks from `collectMissingFields`, not raw Tier 1 text.
- **`lib/report/tier1-gap-prompts.ts`** — keep passing Tier 1 prompts into `previousQuestions` for gap generation.
- **`.cursor/rules/waik-ui-ux-patterns.mdc`** — staff report shell unchanged.

---

## Task index (execute in this order)

| Order | ID | Task | Est. | Task file | Status |
|------:|----|------|------|-----------|--------|
| 1 | **29** | Wire structured extraction in `analyzeNarrativeAndScore` | 2–3h | [task-29-analyzer-structured-extraction-done.md](./task-29-analyzer-structured-extraction-done.md) | **Done (v1)** — tools + `tool_calls` parsing in `analyze.ts` |
| 2 | **30** | Expand & align gap missing-field catalog | 2–3h | [task-30-gap-field-catalog-alignment-done.md](./task-30-gap-field-catalog-alignment-done.md) | **Done (v1)** — boolean + notification fields in `gap_questions.ts` |
| 3 | **31** | Pre-gap extraction normalization on Tier 1 complete | 1–2h | [task-31-pre-gap-extraction-normalization-done.md](./task-31-pre-gap-extraction-normalization-done.md) | **Done (v1)** — `runTier1GapAnalysis` shared pipeline |
| 4 | **32** | Gap analysis failure / empty Tier 2 retry UX | 1–2h | [task-32-gap-analysis-retry-ux-done.md](./task-32-gap-analysis-retry-ux-done.md) | **Done (v1)** — `__RETRY_GAP__` + staff Retry UI |
| 5 | **33** | Tier 2 question generation quality pass | 2h | [task-33-tier2-question-generation-quality-done.md](./task-33-tier2-question-generation-quality-done.md) | **Done (v1)** — prompts + fallback tone |

**Total estimate:** ~8–12 hours

---

## Dependency order

```
29 → 30 → 31 → 33
      ↘
       32 (after 29; may parallelize with 30–31)
```

Task **32** overlaps **Phase 9 task-27** (same retry UX). Implemented in Phase 10; Phase 9 task-27 can be marked Done (v1) as verify-only when reached.

---

## When a task is **done** (required convention)

1. At the top of the task file, set **`Status: DONE`** and the completion date (or add a `## Status` section).
2. **Rename** the file by appending **`-done`** immediately before `.md`, keeping the task number and slug unchanged.  
   Example: `task-29-analyzer-structured-extraction.md` → `task-29-analyzer-structured-extraction-done.md`
3. **Update this README:**
   - Change the task row **Status** from **Open** to **Done (v1)** with a one-line note of what shipped.
   - Update **What’s done vs what remains** below.
   - Set **Last updated** to the completion date.
4. Optionally add a short **Files created / modified** bullet under the completed task row in this README.
5. When **all** tasks 29–33 are done, set the phase **Status** at the top of this file to **IMPLEMENTED** and tick Phase 10 items in [`../PILOT_READY.md`](../PILOT_READY.md) after manual QA.

**Do not** leave duplicate files (`task-29-….md` and `task-29-…-done.md`); rename in place.

---

## What’s done vs what remains

### Done

- Structured analyzer extraction via OpenAI tools (`lib/agents/expert_investigator/analyze.ts`).
- Expanded gap missing-field catalog including critical booleans and post-fall notifications (`gap_questions.ts`).
- Shared Tier 1 gap pipeline: analyze → normalize → completeness → gap questions (`lib/report/run-tier1-gap-analysis.ts`, used by `app/api/report/answer/route.ts`).
- Gap retry: `__RETRY_GAP__` handler + empty Tier 2 Retry UI (`app/staff/report/page.tsx`).
- Tier 2 prompt and fallback wording improvements (`gap_questions.ts`, `tier2-board.ts`).

### Remains (manual pilot QA)

| Symptom | Action |
|--------|--------|
| Rich Tier 1 still gets redundant Tier 2 in production | Run manual tests in task-29/30/33 done files; tune prompts with real nurse transcripts |
| Retry after timeout in production | Test with slow network; confirm `tier2` phase + Retry on device |
| Phase 9 task-27 duplicate | Mark Phase 9 task-27 Done (v1) verify-only or skip implementation there |
| PILOT_READY Phase 10 checkboxes | Tick after manual QA on staging |

---

## Files created / modified (phase 10 v1)

| File | Change |
|------|--------|
| `lib/agents/expert_investigator/analyze.ts` | Tool calling + parse `tool_calls` / legacy `function_call` |
| `lib/agents/expert_investigator/gap_questions.ts` | Missing-field catalog, `isGoldStandardFieldMissing`, prompts |
| `lib/report/run-tier1-gap-analysis.ts` | **New** shared gap pipeline |
| `lib/report/tier2-board.ts` | Supplement generic copy |
| `app/api/report/answer/route.ts` | `runTier1GapAnalysis`, `__RETRY_GAP__`, failure → `tier2` phase |
| `app/staff/report/page.tsx` | Empty board Retry UX |

---

## Primary code touchpoints

| Area | Files |
|------|--------|
| Report API | `app/api/report/answer/route.ts` |
| Analyzer | `lib/agents/expert_investigator/analyze.ts` |
| Gap questions | `lib/agents/expert_investigator/gap_questions.ts` |
| Gap pipeline | `lib/report/run-tier1-gap-analysis.ts` |
| Staff report | `app/staff/report/page.tsx` |

---

## Verification commands (after implementation)

```bash
npm run typecheck
npm run lint
npm run build
npm test -- tier1 tier2 analyzer
```

Manual QA: complete all Tier 1 fall questions with a **rich** narrative → confirm Tier 2 does **not** repeat those themes → answer one Tier 2 → board updates → simulate gap failure (timeout or unset `OPENAI_API_KEY` in dev) → **Retry** recovers questions.

---

## Related docs

- Investigation summary: Tier 2 pipeline review 2026-05-21.
- Extraction gaps: [`../fixes/analyzer_extraction_fix/analyzer_extraction_context.md`](../fixes/analyzer_extraction_fix/analyzer_extraction_context.md)
- Phase 9 (persistence; task-27 overlap): [`../phase_9/README.md`](../phase_9/README.md)
- Blueprint: [`../incident_report/WAiK_Incident_Reporting_Blueprint.md`](../incident_report/WAiK_Incident_Reporting_Blueprint.md)
- Master checklist: [`../PILOT_READY.md`](../PILOT_READY.md)

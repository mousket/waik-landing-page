# Task IR-2e — Report card LLM coaching tips — DONE

**Spec reference:** `task-IR-2c-through-2g.md` (IR-2e section).

## Delivered

- `lib/agents/coaching-tips-generator.ts` — `generateCoachingTips` uses session-level metrics plus `AgentState.missingFields` / `AgentState.filledFields` when present; JSON `{ "tips": string[] }` from the model; fallback tips if OpenAI is off or parsing fails.
- `app/api/report/complete/route.ts` — heuristic `coachingTips` array replaced with `await generateCoachingTips(...)` using the same streak/average math already computed for the report card.

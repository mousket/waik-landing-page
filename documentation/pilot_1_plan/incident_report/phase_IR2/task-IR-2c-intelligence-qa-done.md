# Task IR-2c — Intelligence Q&A (cross-incident) — DONE

**Spec reference:** `task-IR-2c-through-2g.md` (IR-2c section).

## Delivered

- `answerCrossFacilityIntelligence` in `lib/agents/intelligence-qa.ts` — vector retrieval (`searchFacilityIncidents`) + optional `staffId` filter for personal scope + 30‑day `queryFacilityIncidentStats` (also staff-scoped when personal) + single LLM synthesis; returns `citations` and `searchMethod`.
- `POST /api/intelligence/query` — any signed-in user with a facility; staff default to **personal** reports; admin-tier may pass `scope` (`personal` | `facility`).
- `POST /api/admin/intelligence/query` — delegates to the same pipeline; accepts `query` or `question` and optional `scope`.
- `SearchFilters.staffId` in `lib/agents/vector-search.ts`; optional `staffId` on `queryFacilityIncidentStats`.
- `buildOrGetInsights` — adds `insights[]` (weekly summary, optional location hotspot / repeat residents, documentation quality) backed by `queryFacilityIncidentStats`; Redis **`waik:insights:<facilityId>`** (TTL 1h) with read fallback to legacy **`waik:intel:insights:`**; still returns existing `cards` for current UI.

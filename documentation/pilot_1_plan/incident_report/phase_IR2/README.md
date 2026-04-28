# Phase IR-2 — Intelligence Pipeline
## Epic Overview

---

## What This Phase Builds

The intelligence layer that transforms WAiK from a documentation tool
into an institutional memory system. When this phase is done, every
signed incident generates a searchable embedding, facility-wide queries
return answers drawn from all incidents, the clinical record generator
produces professional documentation, a verification agent ensures
fidelity, and the report card delivers LLM-powered coaching tips
personalized to each nurse's specific gaps.

---

## Architecture Reference

All tasks reference:
**WAiK_Incident_Reporting_Blueprint.md** — Sections 6 (RAG Strategy) and 7 (Analytics)

---

## Subtask Index

| Task   | What It Builds                                        | Est. Time |
|--------|------------------------------------------------------|-----------|
| IR-2a  | Embedding generation at sign-off                     | 2-3 hrs   |
| IR-2b  | Facility-wide vector search (Atlas or in-process)    | 3-4 hrs   |
| IR-2c  | Intelligence Q&A agent rebuild (cross-incident)      | 3-4 hrs   |
| IR-2d  | Clinical record verification agent                   | 2-3 hrs   |
| IR-2e  | Report card LLM coaching tips                        | 2 hrs     |
| IR-2f  | Tier 1 question configuration API                    | 2 hrs     |
| IR-2g  | Integration verification                             | 1-2 hrs   |

---

## Dependencies

Phase IR-1 must be complete (all three new routes working).
POST /api/report/complete must be generating clinical records.
Redis and MongoDB connections must be stable.
OpenAI API key must be configured for embeddings (text-embedding-3-small).

---

## New Files Created

```
lib/agents/embedding-service.ts            — embedding generation + storage
lib/agents/vector-search.ts                — facility-wide incident search
lib/agents/verification-agent.ts           — clinical record fidelity check
lib/agents/coaching-tips-generator.ts      — LLM-powered report card tips
app/api/intelligence/query/route.ts        — facility-wide intelligence Q&A
app/api/admin/intelligence/insights/route.ts — auto-generated insight cards
```

## Files Modified

```
app/api/report/complete/route.ts           — add embedding generation + verification
lib/agents/intelligence-qa.ts              — extend to cross-incident search
```

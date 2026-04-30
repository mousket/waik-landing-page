# Task IR-2b — Facility-Wide Vector Search
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 3–4 hours
## Depends On: IR-2a complete (embeddings stored on incidents)

---

## Why This Task Exists

The current Intelligence Q&A searches one incident at a time using
in-process memory. That answers "what happened in this incident?" but
cannot answer "what are the most common fall locations this month?"
or "which residents have had repeated incidents?"

This task builds the retrieval layer that searches across ALL incidents
in a facility. It supports two modes: MongoDB Atlas $vectorSearch (if
available on the current tier) and an in-process cosine fallback for
the pilot.

---

## What This Task Creates

1. `lib/agents/vector-search.ts` — facility-wide semantic search

---

## Context Files

- `lib/openai.ts` — generateEmbedding, cosineSimilarity (both exist)
- `lib/agents/embedding-service.ts` — from IR-2a
- `backend/src/models/incident.model.ts` — IncidentModel with embedding field
- `blueprint/WAiK_Incident_Reporting_Blueprint.md` — Section 6, Layer 2

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] searchFacilityIncidents(facilityId, query, limit) returns ranked results
- [ ] Results include incident metadata (id, type, resident, date, score)
- [ ] Results include relevant text snippets from the clinical record
- [ ] Search is scoped to facilityId (cross-facility leakage impossible)
- [ ] In-process fallback works when Atlas $vectorSearch is not available
- [ ] Atlas $vectorSearch path works if Atlas vector index exists
- [ ] Empty query returns empty results (not an error)
- [ ] Facility with no embedded incidents returns empty results gracefully

---

## Test Cases

```
TEST 1 — Search returns relevant results
  Action: Create 3 incidents with embeddings (via full report flow),
          then call searchFacilityIncidents(facilityId, "fall in bathroom")
  Expected: Returns ranked results, most relevant first
  Pass/Fail: ___

TEST 2 — Search is facility-scoped
  Action: Create incidents in two different facilities
          Search from facility A
  Expected: Only facility A incidents returned
  Pass/Fail: ___

TEST 3 — No embeddings returns empty
  Action: Search a facility with no completed incidents
  Expected: { results: [], totalSearched: 0 }
  Pass/Fail: ___

TEST 4 — Search with metadata filtering
  Action: searchFacilityIncidents(facilityId, "medication changes",
          { incidentType: "fall", dateFrom: "2026-04-01" })
  Expected: Only fall incidents from April onward returned
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building facility-wide vector search for WAiK Intelligence.
This enables cross-incident semantic search scoped to a single facility.

REFERENCE: Blueprint Section 6, Layer 2.
READ lib/openai.ts to see the existing generateEmbedding and
cosineSimilarity functions.

═══════════════════════════════════════════════════════════
CREATE lib/agents/vector-search.ts
═══════════════════════════════════════════════════════════

import { generateEmbedding, cosineSimilarity } from "@/lib/openai"

interface SearchFilters {
  incidentType?: string
  dateFrom?: string        // ISO date
  dateTo?: string          // ISO date
  residentId?: string
  phase?: string | string[]
}

interface SearchResult {
  incidentId: string
  incidentType: string
  residentName: string
  residentRoom: string
  location: string
  incidentDate: string
  phase: string
  completenessScore: number
  similarityScore: number        // 0-1 cosine similarity
  snippet: string                // first 200 chars of clinical record
}

interface SearchResponse {
  results: SearchResult[]
  totalSearched: number
  searchMethod: "atlas_vector" | "in_process_cosine"
}

export async function searchFacilityIncidents(
  facilityId: string,
  query: string,
  limit: number = 10,
  filters?: SearchFilters
): Promise<SearchResponse> {

  if (!query || !query.trim()) {
    return { results: [], totalSearched: 0, searchMethod: "in_process_cosine" }
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Try Atlas $vectorSearch first, fall back to in-process
  try {
    return await atlasVectorSearch(facilityId, queryEmbedding, limit, filters)
  } catch (atlasError) {
    console.log("[vector-search] Atlas $vectorSearch not available, using in-process fallback")
    return await inProcessSearch(facilityId, queryEmbedding, limit, filters)
  }
}

// ── OPTION A: MongoDB Atlas Vector Search ──────────────────

async function atlasVectorSearch(
  facilityId: string,
  queryEmbedding: number[],
  limit: number,
  filters?: SearchFilters
): Promise<SearchResponse> {

  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  // Build pre-filter for $vectorSearch
  const preFilter: any = { facilityId }
  if (filters?.incidentType) preFilter.incidentType = filters.incidentType
  if (filters?.residentId) preFilter.residentId = filters.residentId
  if (filters?.phase) {
    preFilter.phase = Array.isArray(filters.phase)
      ? { $in: filters.phase }
      : filters.phase
  }
  if (filters?.dateFrom || filters?.dateTo) {
    preFilter.incidentDate = {}
    if (filters?.dateFrom) preFilter.incidentDate.$gte = new Date(filters.dateFrom)
    if (filters?.dateTo) preFilter.incidentDate.$lte = new Date(filters.dateTo)
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: "incident_embedding_index",  // must be created in Atlas
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.min(limit * 10, 100),
        limit,
        filter: preFilter,
      }
    },
    {
      $project: {
        id: 1,
        incidentType: 1,
        residentName: 1,
        residentRoom: 1,
        location: 1,
        incidentDate: 1,
        phase: 1,
        completenessScore: 1,
        summary: 1,
        "initialReport.enhancedNarrative": 1,
        score: { $meta: "vectorSearchScore" },
      }
    }
  ]

  const results = await IncidentModel.aggregate(pipeline)

  return {
    results: results.map(r => ({
      incidentId: r.id,
      incidentType: r.incidentType || "unknown",
      residentName: r.residentName || "",
      residentRoom: r.residentRoom || "",
      location: r.location || "",
      incidentDate: r.incidentDate?.toISOString() || "",
      phase: r.phase || "",
      completenessScore: r.completenessScore || 0,
      similarityScore: r.score || 0,
      snippet: (r.initialReport?.enhancedNarrative || r.summary || "").slice(0, 200),
    })),
    totalSearched: results.length,
    searchMethod: "atlas_vector",
  }
}

// ── OPTION B: In-Process Cosine Fallback ───────────────────

async function inProcessSearch(
  facilityId: string,
  queryEmbedding: number[],
  limit: number,
  filters?: SearchFilters
): Promise<SearchResponse> {

  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  // Build Mongo query
  const query: any = {
    facilityId,
    embedding: { $ne: null },
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
  }
  if (filters?.incidentType) query.incidentType = filters.incidentType
  if (filters?.residentId) query.residentId = filters.residentId
  if (filters?.phase) {
    query.phase = Array.isArray(filters.phase)
      ? { $in: filters.phase }
      : filters.phase
  }
  if (filters?.dateFrom || filters?.dateTo) {
    query.incidentDate = {}
    if (filters?.dateFrom) query.incidentDate.$gte = new Date(filters.dateFrom)
    if (filters?.dateTo) query.incidentDate.$lte = new Date(filters.dateTo)
  }

  // Fetch all matching incidents WITH their embeddings
  // For pilot scale (10-50 incidents) this is fine
  // For production: migrate to Atlas $vectorSearch
  const incidents = await IncidentModel.find(query)
    .select("+embedding id incidentType residentName residentRoom location incidentDate phase completenessScore summary initialReport.enhancedNarrative")
    .lean()

  if (incidents.length === 0) {
    return { results: [], totalSearched: 0, searchMethod: "in_process_cosine" }
  }

  // Score each incident by cosine similarity
  const scored = incidents
    .filter(inc => inc.embedding && Array.isArray(inc.embedding) && inc.embedding.length > 0)
    .map(inc => ({
      incident: inc,
      similarity: cosineSimilarity(queryEmbedding, inc.embedding as number[]),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return {
    results: scored.map(({ incident: r, similarity }) => ({
      incidentId: r.id,
      incidentType: r.incidentType || "unknown",
      residentName: r.residentName || "",
      residentRoom: r.residentRoom || "",
      location: r.location || "",
      incidentDate: r.incidentDate?.toISOString() || "",
      phase: r.phase || "",
      completenessScore: r.completenessScore || 0,
      similarityScore: Math.round(similarity * 1000) / 1000,
      snippet: (r.initialReport?.enhancedNarrative || r.summary || "").slice(0, 200),
    })),
    totalSearched: incidents.length,
    searchMethod: "in_process_cosine",
  }
}

// ── Structured data search (non-semantic) ──────────────────
// For queries that need exact data ("how many falls this month"),
// not semantic similarity

export async function queryFacilityIncidentStats(
  facilityId: string,
  dateFrom: Date,
  dateTo: Date,
  incidentType?: string
): Promise<{
  total: number
  byType: Record<string, number>
  byLocation: Record<string, number>
  byResident: Array<{ residentName: string; residentRoom: string; count: number }>
  avgCompleteness: number
  avgActiveSeconds: number
}> {
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const query: any = {
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    createdAt: { $gte: dateFrom, $lte: dateTo },
  }
  if (incidentType) query.incidentType = incidentType

  const incidents = await IncidentModel.find(query)
    .select("incidentType location residentName residentRoom completenessAtSignoff activeDataCollectionSeconds")
    .lean()

  const byType: Record<string, number> = {}
  const byLocation: Record<string, number> = {}
  const residentMap: Record<string, { name: string; room: string; count: number }> = {}
  let totalCompleteness = 0
  let totalActiveSeconds = 0

  for (const inc of incidents) {
    const type = inc.incidentType || "unknown"
    byType[type] = (byType[type] || 0) + 1

    const loc = inc.location || "unknown"
    byLocation[loc] = (byLocation[loc] || 0) + 1

    const resKey = inc.residentName || "unknown"
    if (!residentMap[resKey]) {
      residentMap[resKey] = { name: inc.residentName || "", room: inc.residentRoom || "", count: 0 }
    }
    residentMap[resKey].count++

    totalCompleteness += (inc.completenessAtSignoff || 0)
    totalActiveSeconds += (inc.activeDataCollectionSeconds || 0)
  }

  const byResident = Object.values(residentMap)
    .sort((a, b) => b.count - a.count)

  return {
    total: incidents.length,
    byType,
    byLocation,
    byResident,
    avgCompleteness: incidents.length > 0
      ? Math.round(totalCompleteness / incidents.length)
      : 0,
    avgActiveSeconds: incidents.length > 0
      ? Math.round(totalActiveSeconds / incidents.length)
      : 0,
  }
}

NOTES:
- The Atlas $vectorSearch requires creating an index in MongoDB Atlas
  console named "incident_embedding_index" on the "embedding" field.
  If the index does not exist, the aggregation throws and we fall
  back to in-process cosine.
- The in-process fallback loads all embeddings into memory. At pilot
  scale (10-50 incidents, ~6KB per embedding) this is ~300KB — fine.
  At 1000+ incidents, migrate to Atlas.
- The select("+embedding") override is needed because the embedding
  field has select: false on the schema.
- cosineSimilarity from lib/openai.ts handles the math.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Document which search method is active (atlas vs in-process)
- Create `plan/pilot_1/phase_IR2/task-IR-2b-DONE.md`

/**
 * Facility-Wide Vector Search — IR-2b
 *
 * Cross-incident semantic search scoped to a single facility. Tries
 * MongoDB Atlas $vectorSearch first (requires an "incident_embedding_index"
 * vector index on the embedding field) and falls back to in-process cosine
 * similarity for pilot-scale deployments where Atlas vector search is not
 * provisioned.
 *
 * Reference: WAiK_Incident_Reporting_Blueprint.md — Section 6, Layer 2.
 */

import { generateEmbedding, cosineSimilarity } from "@/lib/openai"

export interface SearchFilters {
  incidentType?: string
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
  residentId?: string
  phase?: string | string[]
}

export interface SearchResult {
  incidentId: string
  incidentType: string
  residentName: string
  residentRoom: string
  location: string
  incidentDate: string
  phase: string
  completenessScore: number
  similarityScore: number // 0-1 cosine similarity
  snippet: string // first 200 chars of clinical record
}

export interface SearchResponse {
  results: SearchResult[]
  totalSearched: number
  searchMethod: "atlas_vector" | "in_process_cosine"
}

const SEARCHABLE_PHASES = [
  "phase_1_complete",
  "phase_2_in_progress",
  "closed",
] as const

export async function searchFacilityIncidents(
  facilityId: string,
  query: string,
  limit: number = 10,
  filters?: SearchFilters,
): Promise<SearchResponse> {
  if (!query || !query.trim()) {
    return { results: [], totalSearched: 0, searchMethod: "in_process_cosine" }
  }

  const queryEmbedding = await generateEmbedding(query)

  try {
    return await atlasVectorSearch(facilityId, queryEmbedding, limit, filters)
  } catch (atlasError) {
    console.log(
      "[vector-search] Atlas $vectorSearch not available, using in-process fallback:",
      atlasError instanceof Error ? atlasError.message : String(atlasError),
    )
    return await inProcessSearch(facilityId, queryEmbedding, limit, filters)
  }
}

// ── OPTION A: MongoDB Atlas Vector Search ──────────────────

async function atlasVectorSearch(
  facilityId: string,
  queryEmbedding: number[],
  limit: number,
  filters?: SearchFilters,
): Promise<SearchResponse> {
  const { default: connectMongo } = await import("@/backend/src/lib/mongodb")
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  await connectMongo()

  const preFilter: Record<string, unknown> = { facilityId }
  if (filters?.incidentType) preFilter.incidentType = filters.incidentType
  if (filters?.residentId) preFilter.residentId = filters.residentId
  if (filters?.phase) {
    preFilter.phase = Array.isArray(filters.phase)
      ? { $in: filters.phase }
      : filters.phase
  } else {
    preFilter.phase = { $in: [...SEARCHABLE_PHASES] }
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const range: Record<string, Date> = {}
    if (filters?.dateFrom) range.$gte = new Date(filters.dateFrom)
    if (filters?.dateTo) range.$lte = new Date(filters.dateTo)
    preFilter.incidentDate = range
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: "incident_embedding_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.min(limit * 10, 100),
        limit,
        filter: preFilter,
      },
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
      },
    },
  ]

  const results = await IncidentModel.aggregate(pipeline)

  return {
    results: results.map((r: AtlasResultRow) => ({
      incidentId: r.id,
      incidentType: r.incidentType || "unknown",
      residentName: r.residentName || "",
      residentRoom: r.residentRoom || "",
      location: r.location || "",
      incidentDate: r.incidentDate
        ? new Date(r.incidentDate).toISOString()
        : "",
      phase: r.phase || "",
      completenessScore: r.completenessScore || 0,
      similarityScore: r.score || 0,
      snippet: (r.initialReport?.enhancedNarrative || r.summary || "").slice(
        0,
        200,
      ),
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
  filters?: SearchFilters,
): Promise<SearchResponse> {
  const { default: connectMongo } = await import("@/backend/src/lib/mongodb")
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  await connectMongo()

  const query: Record<string, unknown> = {
    facilityId,
    embedding: { $ne: null },
  }
  if (filters?.phase) {
    query.phase = Array.isArray(filters.phase)
      ? { $in: filters.phase }
      : filters.phase
  } else {
    query.phase = { $in: [...SEARCHABLE_PHASES] }
  }
  if (filters?.incidentType) query.incidentType = filters.incidentType
  if (filters?.residentId) query.residentId = filters.residentId
  if (filters?.dateFrom || filters?.dateTo) {
    const range: Record<string, Date> = {}
    if (filters?.dateFrom) range.$gte = new Date(filters.dateFrom)
    if (filters?.dateTo) range.$lte = new Date(filters.dateTo)
    query.incidentDate = range
  }

  const incidents = await IncidentModel.find(query)
    .select(
      "+embedding id incidentType residentName residentRoom location incidentDate phase completenessScore summary initialReport.enhancedNarrative",
    )
    .lean<InProcessRow[]>()

  if (incidents.length === 0) {
    return { results: [], totalSearched: 0, searchMethod: "in_process_cosine" }
  }

  const scored = incidents
    .filter(
      (inc) =>
        Array.isArray(inc.embedding) &&
        inc.embedding.length === queryEmbedding.length,
    )
    .map((inc) => ({
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
      incidentDate: r.incidentDate
        ? new Date(r.incidentDate).toISOString()
        : "",
      phase: r.phase || "",
      completenessScore: r.completenessScore || 0,
      similarityScore: Math.round(similarity * 1000) / 1000,
      snippet: (r.initialReport?.enhancedNarrative || r.summary || "").slice(
        0,
        200,
      ),
    })),
    totalSearched: incidents.length,
    searchMethod: "in_process_cosine",
  }
}

// ── Structured (non-semantic) facility stats ───────────────

export interface FacilityIncidentStats {
  total: number
  byType: Record<string, number>
  byLocation: Record<string, number>
  byResident: Array<{ residentName: string; residentRoom: string; count: number }>
  avgCompleteness: number
  avgActiveSeconds: number
}

export async function queryFacilityIncidentStats(
  facilityId: string,
  dateFrom: Date,
  dateTo: Date,
  incidentType?: string,
): Promise<FacilityIncidentStats> {
  const { default: connectMongo } = await import("@/backend/src/lib/mongodb")
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  await connectMongo()

  const query: Record<string, unknown> = {
    facilityId,
    phase: { $in: [...SEARCHABLE_PHASES] },
    createdAt: { $gte: dateFrom, $lte: dateTo },
  }
  if (incidentType) query.incidentType = incidentType

  const incidents = await IncidentModel.find(query)
    .select(
      "incidentType location residentName residentRoom completenessAtSignoff activeDataCollectionSeconds",
    )
    .lean<StatsRow[]>()

  const byType: Record<string, number> = {}
  const byLocation: Record<string, number> = {}
  const residentMap: Record<
    string,
    { name: string; room: string; count: number }
  > = {}
  let totalCompleteness = 0
  let totalActiveSeconds = 0

  for (const inc of incidents) {
    const type = inc.incidentType || "unknown"
    byType[type] = (byType[type] || 0) + 1

    const loc = inc.location || "unknown"
    byLocation[loc] = (byLocation[loc] || 0) + 1

    const resKey = inc.residentName || "unknown"
    if (!residentMap[resKey]) {
      residentMap[resKey] = {
        name: inc.residentName || "",
        room: inc.residentRoom || "",
        count: 0,
      }
    }
    residentMap[resKey].count++

    totalCompleteness += inc.completenessAtSignoff || 0
    totalActiveSeconds += inc.activeDataCollectionSeconds || 0
  }

  const byResident = Object.values(residentMap)
    .map((r) => ({ residentName: r.name, residentRoom: r.room, count: r.count }))
    .sort((a, b) => b.count - a.count)

  return {
    total: incidents.length,
    byType,
    byLocation,
    byResident,
    avgCompleteness:
      incidents.length > 0
        ? Math.round(totalCompleteness / incidents.length)
        : 0,
    avgActiveSeconds:
      incidents.length > 0
        ? Math.round(totalActiveSeconds / incidents.length)
        : 0,
  }
}

// ── Internal row shapes ────────────────────────────────────

interface AtlasResultRow {
  id: string
  incidentType?: string
  residentName?: string
  residentRoom?: string
  location?: string
  incidentDate?: Date | string
  phase?: string
  completenessScore?: number
  summary?: string | null
  initialReport?: { enhancedNarrative?: string }
  score?: number
}

interface InProcessRow {
  id: string
  incidentType?: string
  residentName?: string
  residentRoom?: string
  location?: string
  incidentDate?: Date | string
  phase?: string
  completenessScore?: number
  summary?: string | null
  initialReport?: { enhancedNarrative?: string }
  embedding?: number[] | null
}

interface StatsRow {
  incidentType?: string
  location?: string
  residentName?: string
  residentRoom?: string
  completenessAtSignoff?: number
  activeDataCollectionSeconds?: number
}

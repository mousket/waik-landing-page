import connectMongo from "@/backend/src/lib/mongodb"
import { cosineSimilarity, generateEmbedding } from "@/lib/openai"

export interface SearchFilters {
  incidentType?: string
  dateFrom?: string
  dateTo?: string
  residentId?: string
  /** Restricts retrieval to incidents where `Incident.staffId` matches this user id */
  staffId?: string
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
  /** Semantic relevance: cosine (in-process 0–1) or Atlas vectorSearchScore metadata */
  similarityScore: number
  snippet: string
}

export interface SearchResponse {
  results: SearchResult[]
  totalSearched: number
  searchMethod: "atlas_vector" | "in_process_cosine"
}

/** Incident has a non-null, non-empty embedding array stored in MongoDB. */
function embeddingPresentFilter(): { $exists: true; $nin: unknown[] } {
  return { $exists: true, $nin: [null, []] }
}

const SIGNED_PHASES = ["phase_1_complete", "phase_2_in_progress", "closed"] as const

/** Limits to signed / investigatable phases; optional filter narrows within that set. */
function normalizedPhaseMongo(filters?: SearchFilters): { $in: string[] } {
  const f = filters?.phase
  const requested =
    f == null ? [...SIGNED_PHASES] : (Array.isArray(f) ? f : [f])
  const narrowed = requested.filter((p): p is (typeof SIGNED_PHASES)[number] =>
    (SIGNED_PHASES as readonly string[]).includes(p),
  )
  return narrowed.length > 0 ? { $in: narrowed } : { $in: [...SIGNED_PHASES] }
}

/** facilityId plus optional incidentType, residentId, incidentDate range — no phase (handled separately). */
function baseFacilityFilters(facilityId: string, filters: SearchFilters | undefined): Record<string, unknown> {
  const q: Record<string, unknown> = { facilityId }
  if (filters?.incidentType) q.incidentType = filters.incidentType
  if (filters?.residentId) q.residentId = filters.residentId
  if (filters?.staffId) q.staffId = filters.staffId
  if (filters?.dateFrom || filters?.dateTo) {
    const incidentDate: Record<string, Date> = {}
    if (filters?.dateFrom) incidentDate.$gte = new Date(filters.dateFrom)
    if (filters?.dateTo) incidentDate.$lte = new Date(filters.dateTo)
    q.incidentDate = incidentDate
  }
  return q
}

function snippetFromDoc(r: {
  summary?: string | null
  initialReport?: { enhancedNarrative?: string | null }
}): string {
  return (
    r.initialReport?.enhancedNarrative ||
    r.summary ||
    ""
  ).slice(0, 200)
}

export async function searchFacilityIncidents(
  facilityId: string,
  query: string,
  limit = 10,
  filters?: SearchFilters,
): Promise<SearchResponse> {
  await connectMongo()

  if (!query?.trim()) {
    return { results: [], totalSearched: 0, searchMethod: "in_process_cosine" }
  }

  const queryEmbedding = await generateEmbedding(query.trim())

  try {
    return await atlasVectorSearch(facilityId, queryEmbedding, limit, filters)
  } catch (atlasError) {
    console.log(
      "[vector-search] Atlas $vectorSearch not available, using in-process fallback:",
      atlasError instanceof Error ? atlasError.message : atlasError,
    )
    return inProcessSearch(facilityId, queryEmbedding, limit, filters)
  }
}

async function atlasVectorSearch(
  facilityId: string,
  queryEmbedding: number[],
  limit: number,
  filters?: SearchFilters,
): Promise<SearchResponse> {
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const preFilter: Record<string, unknown> = {
    ...baseFacilityFilters(facilityId, filters),
    phase: normalizedPhaseMongo(filters),
    embedding: embeddingPresentFilter(),
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: "incident_embedding_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.min(Math.max(limit * 10, limit), 200),
        limit: Math.min(Math.max(limit, 1), 100),
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

  type AtlasHit = {
    id: string
    incidentType?: string
    residentName?: string
    residentRoom?: string
    location?: string
    incidentDate?: Date
    phase?: string
    completenessScore?: number
    summary?: string | null
    initialReport?: { enhancedNarrative?: string | null }
    score?: number
  }

  const mapped = (results as AtlasHit[]).map((r) => ({
    incidentId: r.id,
    incidentType: r.incidentType || "unknown",
    residentName: r.residentName || "",
    residentRoom: r.residentRoom || "",
    location: r.location || "",
    incidentDate: r.incidentDate instanceof Date ? r.incidentDate.toISOString() : "",
    phase: r.phase || "",
    completenessScore: r.completenessScore ?? 0,
    similarityScore: typeof r.score === "number" ? r.score : 0,
    snippet: snippetFromDoc(r),
  }))

  return {
    results: mapped,
    totalSearched: mapped.length,
    searchMethod: "atlas_vector",
  }
}

async function inProcessSearch(
  facilityId: string,
  queryEmbedding: number[],
  limit: number,
  filters?: SearchFilters,
): Promise<SearchResponse> {
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const mongoQuery: Record<string, unknown> = {
    ...baseFacilityFilters(facilityId, filters),
    phase: normalizedPhaseMongo(filters),
    embedding: embeddingPresentFilter(),
  }

  const incidents = await IncidentModel.find(mongoQuery)
    .select(
      "+embedding id incidentType residentName residentRoom location incidentDate phase completenessScore summary initialReport.enhancedNarrative",
    )
    .lean()

  if (incidents.length === 0) {
    return { results: [], totalSearched: 0, searchMethod: "in_process_cosine" }
  }

  type LeanHit = {
    id: string
    embedding?: number[] | null
    incidentType?: string
    residentName?: string
    residentRoom?: string
    location?: string
    incidentDate?: Date
    phase?: string
    completenessScore?: number
    summary?: string | null
    initialReport?: { enhancedNarrative?: string | null }
  }

  const hits = incidents as unknown as LeanHit[]
  const scored = hits
    .filter(
      (inc) =>
        inc.embedding &&
        Array.isArray(inc.embedding) &&
        inc.embedding.length === queryEmbedding.length,
    )
    .map((inc) => ({
      incident: inc,
      similarity: cosineSimilarity(queryEmbedding, inc.embedding as number[]),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(limit, 1))

  return {
    results: scored.map(({ incident: r, similarity }) => ({
      incidentId: r.id,
      incidentType: r.incidentType || "unknown",
      residentName: r.residentName || "",
      residentRoom: r.residentRoom || "",
      location: r.location || "",
      incidentDate: r.incidentDate instanceof Date ? r.incidentDate.toISOString() : "",
      phase: r.phase || "",
      completenessScore: r.completenessScore ?? 0,
      similarityScore: Math.round(Math.max(0, Math.min(1, similarity)) * 1000) / 1000,
      snippet: snippetFromDoc(r),
    })),
    totalSearched: incidents.length,
    searchMethod: "in_process_cosine",
  }
}

/** Aggregate counts/locations/residents over a window (deterministic Mongo query, no vectors). */
export async function queryFacilityIncidentStats(
  facilityId: string,
  dateFrom: Date,
  dateTo: Date,
  incidentType?: string,
  opts?: { staffId?: string },
): Promise<{
  total: number
  byType: Record<string, number>
  byLocation: Record<string, number>
  byResident: Array<{ residentName: string; residentRoom: string; count: number }>
  avgCompleteness: number
  avgActiveSeconds: number
}> {
  await connectMongo()
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const query: Record<string, unknown> = {
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    createdAt: { $gte: dateFrom, $lte: dateTo },
  }
  if (incidentType) query.incidentType = incidentType
  if (opts?.staffId) query.staffId = opts.staffId

  const incidents = await IncidentModel.find(query)
    .select("incidentType location residentName residentRoom completenessAtSignoff activeDataCollectionSeconds")
    .lean()

  const byType: Record<string, number> = {}
  const byLocation: Record<string, number> = {}
  const residentMap: Record<
    string,
    { residentName: string; residentRoom: string; count: number }
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
        residentName: inc.residentName || "",
        residentRoom: inc.residentRoom || "",
        count: 0,
      }
    }
    residentMap[resKey].count++

    totalCompleteness += Number((inc as { completenessAtSignoff?: number }).completenessAtSignoff || 0)
    totalActiveSeconds += Number((inc as { activeDataCollectionSeconds?: number }).activeDataCollectionSeconds || 0)
  }

  const byResident = Object.values(residentMap).sort((a, b) => b.count - a.count)

  return {
    total: incidents.length,
    byType,
    byLocation,
    byResident,
    avgCompleteness:
      incidents.length > 0 ? Math.round(totalCompleteness / incidents.length) : 0,
    avgActiveSeconds:
      incidents.length > 0 ? Math.round(totalActiveSeconds / incidents.length) : 0,
  }
}

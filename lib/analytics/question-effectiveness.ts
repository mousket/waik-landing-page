/**
 * Question Effectiveness Engine — IR-3c
 *
 * Aggregates `dataPointsPerQuestion` rows across every signed-off
 * incident in a facility to rank Tier 2 follow-up question phrasings
 * by how reliably they elicit Gold Standard data points.
 *
 * Used by /api/admin/analytics/questions and (eventually) by the
 * Question Compressor training loop.
 */

export interface QuestionRanking {
  questionText: string
  timesAsked: number
  avgDataPointsCovered: number
  maxDataPointsCovered: number
  /** Most-frequently covered Gold Standard fields. */
  commonFieldsCovered: string[]
  /** Composite score 0–100. */
  effectivenessScore: number
}

interface RawDataPoint {
  questionId?: string
  questionText?: string
  dataPointsCovered?: number
  fieldsCovered?: string[]
}

interface RawIncident {
  dataPointsPerQuestion?: RawDataPoint[]
}

const SEARCHABLE_PHASES = ["phase_1_complete", "phase_2_in_progress", "closed"] as const

/** Group key — prefer the question text (deduped), fall back to the
 *  questionId when older incidents were persisted before IR-3c added
 *  questionText to the schema. */
function groupKey(dp: RawDataPoint): string | null {
  const text = (dp.questionText || "").toLowerCase().trim().slice(0, 100)
  if (text) return `text::${text}`
  if (dp.questionId) return `id::${dp.questionId}`
  return null
}

export async function rankQuestionEffectiveness(
  facilityId: string,
  incidentType?: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<QuestionRanking[]> {
  const { default: connectMongo } = await import("@/backend/src/lib/mongodb")
  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  await connectMongo()

  const query: Record<string, unknown> = {
    facilityId,
    phase: { $in: [...SEARCHABLE_PHASES] },
    "dataPointsPerQuestion.0": { $exists: true },
  }
  if (incidentType) query.incidentType = incidentType
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {}
    if (dateFrom) range.$gte = dateFrom
    if (dateTo) range.$lte = dateTo
    query.createdAt = range
  }

  const incidents = await IncidentModel.find(query)
    .select("dataPointsPerQuestion")
    .lean<RawIncident[]>()

  type Bucket = {
    text: string
    totalDataPoints: number
    maxDataPoints: number
    count: number
    fieldFrequency: Record<string, number>
  }
  const buckets = new Map<string, Bucket>()

  for (const inc of incidents) {
    for (const dpq of inc.dataPointsPerQuestion || []) {
      const key = groupKey(dpq)
      if (!key) continue

      const displayText = dpq.questionText || dpq.questionId || ""
      const dp = dpq.dataPointsCovered || 0
      const fields = dpq.fieldsCovered || []

      const existing = buckets.get(key) || {
        text: displayText,
        totalDataPoints: 0,
        maxDataPoints: 0,
        count: 0,
        fieldFrequency: {},
      }
      existing.totalDataPoints += dp
      existing.maxDataPoints = Math.max(existing.maxDataPoints, dp)
      existing.count += 1
      // Prefer the longest available phrasing for the display label.
      if (displayText.length > existing.text.length) existing.text = displayText
      for (const field of fields) {
        if (!field) continue
        existing.fieldFrequency[field] = (existing.fieldFrequency[field] || 0) + 1
      }
      buckets.set(key, existing)
    }
  }

  const rankings: QuestionRanking[] = Array.from(buckets.values())
    .filter((q) => q.count >= 2)
    .map((q) => {
      const avgDP = q.totalDataPoints / q.count
      const commonFields = Object.entries(q.fieldFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([field]) => field)

      // Composite score: coverage (50) + frequency (30) + ceiling (20).
      const effectivenessScore = Math.round(
        Math.min(
          100,
          (avgDP / 5) * 50 + (q.count / 10) * 30 + (q.maxDataPoints / 8) * 20,
        ),
      )

      return {
        questionText: q.text,
        timesAsked: q.count,
        avgDataPointsCovered: Math.round(avgDP * 10) / 10,
        maxDataPointsCovered: q.maxDataPoints,
        commonFieldsCovered: commonFields,
        effectivenessScore,
      }
    })
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)

  return rankings
}

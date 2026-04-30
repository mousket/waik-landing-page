import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { answerCrossFacilityIntelligence } from "@/lib/agents/intelligence-qa"
import { getRedis } from "@/lib/redis"
import { queryFacilityIncidentStats } from "@/lib/agents/vector-search"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import { AI_CONFIG } from "@/lib/openai"

/**
 * **Canonical public HTTP paths** (prefer `/api/admin/...` for the web app; `/api/intelligence/...` are thin re-exports).
 * **Redis cache (TTL 1h = 3600s)**:
 * | key pattern | value |
 * |---|---|
 * | `waik:insights:<facilityId>` | JSON insight card bundle (IR-2c canonical; also mirrored to legacy key) |
 * | `waik:intel:insights:<facilityId>` | legacy Redis key |
 * | `waik:admin:daily-brief:<facilityId>` | JSON daily brief |
 */
const INSIGHTS_TTL_SEC = 60 * 60
const BRIEF_TTL_SEC = 60 * 60
const insKey = (f: string) => `waik:insights:${f}`
const insKeyLegacy = (f: string) => `waik:intel:insights:${f}`
const brKey = (f: string) => `waik:admin:daily-brief:${f}`

export type InsightCard = { id: string; title: string; body: string; hint?: string }

/** IR-2c auto-generated insight rows (pattern / alert / summary). */
export type InsightMetaCard = {
  id: string
  type: string
  title: string
  body: string
  priority?: "high" | "normal"
}

type InsightPayload = {
  cards: InsightCard[]
  generatedAt: string
  facilityId: string
  insights?: InsightMetaCard[]
}

type BriefPayload = { text: string; generatedAt: string; facilityId: string }

function parseJsonOr<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function getCachedInsights(facilityId: string): Promise<InsightPayload | null> {
  const redis = getRedis()
  const raw =
    (await redis.get(insKey(facilityId))) ?? (await redis.get(insKeyLegacy(facilityId)))
  if (!raw) {
    return null
  }
  return parseJsonOr(raw, null)
}

async function setCachedInsights(payload: InsightPayload): Promise<void> {
  const s = JSON.stringify(payload)
  const redis = getRedis()
  await redis.set(insKey(payload.facilityId), s, "EX", INSIGHTS_TTL_SEC)
  await redis.set(insKeyLegacy(payload.facilityId), s, "EX", INSIGHTS_TTL_SEC)
}

export async function getCachedDailyBrief(facilityId: string): Promise<BriefPayload | null> {
  const raw = await getRedis().get(brKey(facilityId))
  if (!raw) {
    return null
  }
  return parseJsonOr(raw, null)
}

async function loadIncidents(
  facilityId: string,
): Promise<
  Array<{
    id: string
    title?: string
    description?: string
    phase?: string
    completenessScore?: number
    hasInjury?: boolean
    createdAt?: Date
    staffName?: string
    priority?: string
  }>
> {
  await connectMongo()
  const rows = await IncidentModel.find({ facilityId })
    .sort({ createdAt: -1 })
    .limit(80)
    .lean()
    .exec()
  return rows as unknown as Array<{
    id: string
    title?: string
    description?: string
    phase?: string
    completenessScore?: number
    hasInjury?: boolean
    createdAt?: Date
    staffName?: string
    priority?: string
  }>
}

/**
 * Community-level Q&A: vector search + 30‑day stats + LLM (facility-wide; admin console).
 */
export async function answerCommunityQuery(
  facilityId: string,
  userQuestion: string,
  _facilityLabel = "this facility",
): Promise<string> {
  const q = userQuestion.trim()
  if (!q) {
    return "Please enter a question."
  }

  const rows = await loadIncidents(facilityId)
  if (rows.length === 0) {
    return isOpenAIConfigured()
      ? "There are no incidents in this community yet, so I don’t have data to answer. Once reports are created, I can help summarize and compare them."
      : "No incident data in this community yet. Configure OPENAI_API_KEY for full AI answers."
  }

  const out = await answerCrossFacilityIntelligence({
    facilityId,
    queryingUserId: "community",
    question: q,
    scope: "facility",
  })
  return out.answer
}

/**
 * Four insight cards + 1h Redis cache
 */
export async function buildOrGetInsights(facilityId: string): Promise<InsightPayload> {
  const c = await getCachedInsights(facilityId)
  if (c?.cards?.length === 4 && (c.insights?.length ?? 0) >= 2) {
    return c
  }
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const monthStats = await queryFacilityIncidentStats(facilityId, monthAgo, now)
  const weekStats = await queryFacilityIncidentStats(facilityId, weekAgo, now)
  const rows = await loadIncidents(facilityId)
  const w = rows.filter((i) => i.createdAt && new Date(i.createdAt) >= weekAgo)
  const m = rows.filter((i) => i.createdAt && new Date(i.createdAt) >= monthAgo)
  const avgComp =
    m.length > 0
      ? m.reduce((s, i) => s + (i.completenessScore ?? 0), 0) / m.length
      : 0
  const attention = w.filter(
    (i) => (i.hasInjury && i.priority === "urgent") || (i.completenessScore != null && i.completenessScore < 50),
  ).length
  const byReporter = new Map<string, number>()
  for (const r of w) {
    const k = (r.staffName ?? "Unknown").trim() || "Unknown"
    byReporter.set(k, (byReporter.get(k) ?? 0) + 1)
  }
  let topReporter = "—"
  let topN = 0
  for (const [k, n] of byReporter) {
    if (n > topN) {
      topN = n
      topReporter = k
    }
  }

  const thisWeek: InsightCard = {
    id: "this_week",
    title: "This week at a glance",
    body: `${w.length} incident report(s) in the last 7 days in this community.`,
  }
  const comp: InsightCard = {
    id: "completeness",
    title: "Completeness trend",
    body: m.length
      ? `Average documentation completeness in the last 30 days: ${Math.round(avgComp)}% (based on ${m.length} report(s)).`
      : "Not enough incidents in the last 30 days to measure a trend.",
  }
  const att: InsightCard = {
    id: "attention",
    title: "Attention needed",
    body:
      attention > 0
        ? `Rough signal: ${attention} recent report(s) with injury or low completeness in the 7-day window. Review the Needs Attention dashboard.`
        : "No high-priority signals in the 7-day sample from the available fields.",
  }
  const staff: InsightCard = {
    id: "staff",
    title: "Staff performance",
    body: topN > 0 ? `Most reports filed this week: ${topReporter} (${topN} in the sample).` : "Not enough data to rank reporters this week.",
  }

  if (isOpenAIConfigured() && rows.length) {
    try {
      const pol = await generateChatCompletion(
        [
          {
            role: "system",
            content:
              "You polish one sentence each for four care ops insight cards. Output valid JSON: { thisWeek, completeness, attention, staff } string values. Stay conservative; the numbers in the user message are authoritative.",
          },
          {
            role: "user",
            content: `Draft sentences from these stats only:\nthisWeek: ${w.length} incidents (7d)\ncompleteness: avg ${Math.round(avgComp)}% over ${m.length} incidents (30d)\nattention: ${attention} flagged in sample\nstaff: top ${topReporter} with ${topN} (7d)`,
          },
        ],
        { model: AI_CONFIG.model, maxTokens: 400, response_format: { type: "json_object" } },
      )
      const txt = pol.choices[0]?.message?.content
      if (txt) {
        const j = JSON.parse(txt) as { thisWeek?: string; completeness?: string; attention?: string; staff?: string }
        if (j.thisWeek) {
          thisWeek.body = j.thisWeek
        }
        if (j.completeness) {
          comp.body = j.completeness
        }
        if (j.attention) {
          att.body = j.attention
        }
        if (j.staff) {
          staff.body = j.staff
        }
      }
    } catch {
      /* keep deterministic bodies */
    }
  }

  const insights: InsightMetaCard[] = [
    {
      id: "weekly-summary",
      type: "summary",
      title: "This week",
      body: `${weekStats.total} incident${weekStats.total !== 1 ? "s" : ""} reported this week. Average completeness: ${weekStats.avgCompleteness}%.`,
      priority: weekStats.total > 5 ? "high" : "normal",
    },
  ]

  const topLocation = Object.entries(monthStats.byLocation).sort(([, a], [, b]) => b - a)[0]
  if (topLocation && topLocation[1] >= 3) {
    insights.push({
      id: "location-hotspot",
      type: "pattern",
      title: "Location pattern",
      body: `${topLocation[0]} has had ${topLocation[1]} incidents in the past 30 days — highest in the facility.`,
      priority: "high",
    })
  }

  const repeatResidents = monthStats.byResident.filter((r) => r.count >= 2)
  if (repeatResidents.length > 0) {
    insights.push({
      id: "repeat-residents",
      type: "alert",
      title: "Residents with multiple incidents",
      body: `${repeatResidents.map((r) => `${r.residentName} (Room ${r.residentRoom}): ${r.count} incidents`).join(". ")}. Consider care plan review.`,
      priority: "high",
    })
  }

  insights.push({
    id: "completeness-trend",
    type: "metric",
    title: "Documentation quality",
    body: `Average report completeness: ${monthStats.avgCompleteness}% (30-day). Average data collection time: ${Math.round(monthStats.avgActiveSeconds / 60)} minutes per report.`,
    priority: "normal",
  })

  const out: InsightPayload = {
    facilityId,
    generatedAt: new Date().toISOString(),
    cards: [thisWeek, comp, att, staff],
    insights,
  }
  await setCachedInsights(out)
  return out
}

/**
 * One-paragraph daily brief, cached
 */
export async function buildOrGetDailyBrief(
  facilityId: string,
  _facilityName?: string,
): Promise<BriefPayload> {
  const c = await getCachedDailyBrief(facilityId)
  if (c) {
    return c
  }
  const rows = (await loadIncidents(facilityId)).filter(
    (i) => i.createdAt && new Date(i.createdAt) >= new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  )
  if (!isOpenAIConfigured() || rows.length === 0) {
    const text =
      rows.length === 0
        ? "No incidents in the last 48 hours for a narrative brief. Check back when new reports are filed."
        : `There were ${rows.length} incident(s) in the last 48 hours. Configure OPENAI_API_KEY for a fuller narrative, or use WAiK Intelligence to ask a specific question.`
    const p: BriefPayload = { facilityId, generatedAt: new Date().toISOString(), text }
    await getRedis().set(brKey(facilityId), JSON.stringify(p), "EX", BRIEF_TTL_SEC)
    return p
  }

  const pack = rows
    .slice(0, 20)
    .map((i) => `• ${i.title ?? "Incident"} (${i.phase}): ${(i.description ?? "").slice(0, 180)}`)
    .join("\n")
  const res = await generateChatCompletion(
    [
      {
        role: "system",
        content: "You write a 3-5 sentence clinical operations ‘daily brief’ for ONE facility, based only on the lines provided. Plain text, no PII beyond what is given.",
      },
      { role: "user", content: `Recent reports:\n${pack}\n` },
    ],
    { model: AI_CONFIG.model, maxTokens: 500 },
  )
  const text = res.choices[0]?.message?.content?.trim() ?? "Could not generate brief."
  const p: BriefPayload = { facilityId, generatedAt: new Date().toISOString(), text }
  await getRedis().set(brKey(facilityId), JSON.stringify(p), "EX", BRIEF_TTL_SEC)
  return p
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export type CompletenessWeekPoint = {
  weekKey: string
  weekLabel: string
  avg: number
  count: number
}

function phase1CompletenessScore(row: {
  completenessAtTier1Complete?: number
  completenessScore?: number
}): number {
  const t = row.completenessAtTier1Complete
  if (typeof t === "number" && !Number.isNaN(t)) {
    return t
  }
  return row.completenessScore ?? 0
}

/**
 * Last **8** rolling 7-day windows (oldest first). Averages **Phase-1** completeness
 * (`completenessAtTier1Complete`, else `completenessScore`) for incidents created in each window. Facility-scoped only.
 */
export async function getCompletenessTrend8Weeks(
  facilityId: string,
): Promise<{ weeks: CompletenessWeekPoint[]; facilityId: string; generatedAt: string }> {
  await connectMongo()
  const horizon = new Date(Date.now() - 8 * WEEK_MS)
  const raw = (await IncidentModel.find({
    facilityId,
    createdAt: { $gte: horizon },
  })
    .select("id createdAt completenessAtTier1Complete completenessScore")
    .lean()
    .exec()) as unknown as Array<{
    id: string
    createdAt?: Date
    completenessAtTier1Complete?: number
    completenessScore?: number
  }>

  const now = Date.now()
  const out: CompletenessWeekPoint[] = []
  for (let w = 0; w < 8; w++) {
    const tStart = now - (8 - w) * WEEK_MS
    const tEnd = w === 7 ? now : now - (7 - w) * WEEK_MS
    const sLab = new Date(tStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const eLab = w === 7 ? "now" : new Date(tEnd - 1).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const bucket = raw.filter((r) => {
      if (!r.createdAt) {
        return false
      }
      const t = new Date(r.createdAt).getTime()
      if (w === 7) {
        return t >= tStart && t <= tEnd
      }
      return t >= tStart && t < tEnd
    })
    const sum = bucket.reduce((a, b) => a + phase1CompletenessScore(b), 0)
    const count = bucket.length
    const avg = count > 0 ? Math.round(sum / count) : 0
    out.push({
      weekKey: `w${w + 1}`,
      weekLabel: w === 7 ? `${sLab} → today` : `${sLab}–${eLab}`,
      avg,
      count,
    })
  }

  return {
    facilityId,
    generatedAt: new Date().toISOString(),
    weeks: out,
  }
}

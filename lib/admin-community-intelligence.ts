import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { getRedis } from "@/lib/redis"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import { AI_CONFIG } from "@/lib/openai"
import { queryFacilityIncidentStats } from "@/lib/agents/vector-search"

/**
 * **Canonical public HTTP paths** (prefer `/api/admin/...` for the web app; `/api/intelligence/...` are thin re-exports).
 * **Redis cache (TTL 1h = 3600s)**:
 * | key pattern | value |
 * |---|---|
 * | `waik:intel:insights:<facilityId>` | JSON insight card bundle |
 * | `waik:admin:daily-brief:<facilityId>` | JSON daily brief |
 */
const INSIGHTS_TTL_SEC = 60 * 60
const BRIEF_TTL_SEC = 60 * 60
const insKey = (f: string) => `waik:intel:insights:${f}`
const brKey = (f: string) => `waik:admin:daily-brief:${f}`

export type InsightCard = { id: string; title: string; body: string; hint?: string }

type InsightPayload = { cards: InsightCard[]; generatedAt: string; facilityId: string }

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
  const raw = await getRedis().get(insKey(facilityId))
  if (!raw) {
    return null
  }
  return parseJsonOr(raw, null)
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
 * Community-level Q&A: LLM over facility incident snippets only. Never pass another facility.
 */
export async function answerCommunityQuery(
  facilityId: string,
  userQuestion: string,
  facilityLabel = "this facility",
): Promise<string> {
  const rows = await loadIncidents(facilityId)
  if (rows.length === 0) {
    return isOpenAIConfigured()
      ? "There are no incidents in this community yet, so I don’t have data to answer. Once reports are created, I can help summarize and compare them."
      : "No incident data in this community yet. Configure OPENAI_API_KEY for full AI answers."
  }

  const pack = rows
    .map((i, n) => {
      const t = (i.title ?? "Incident").slice(0, 200)
      const d = (i.description ?? "").slice(0, 500)
      const c = i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : ""
      return `[${n + 1}] id=${i.id} date=${c} phase=${i.phase ?? "?"} completeness=${i.completenessScore ?? 0} priority=${i.priority ?? "?"} inj=${i.hasInjury ? "yes" : "no"}\n staff=${i.staffName ?? ""}\n${t}\n${d}\n---`
    })
    .join("\n")

  if (!isOpenAIConfigured()) {
    return [
      "OpenAI is not configured, so this is a numeric snapshot only (facility-scoped):",
      `• Incidents in sample: ${rows.length}`,
      `• With injury flag: ${rows.filter((i) => i.hasInjury).length}`,
      "Add OPENAI_API_KEY to enable full natural-language answers from this data.",
    ].join(" ")
  }

  const res = await generateChatCompletion(
    [
      {
        role: "system",
        content: `You are WAiK Intelligence for a single skilled nursing community (${facilityLabel}). The ONLY data you may use is the incident list provided below. Do not invent residents, events, or metrics. If the answer is not supported by the list, say you cannot tell from the available records. Keep answers short (2–5 sentences), plain text, no markdown.`,
      },
      {
        role: "user",
        content: `User question: ${userQuestion}

Incident records (this facility only; up to 80, newest first):
${pack}
`,
      },
    ],
    { model: AI_CONFIG.model, maxTokens: 800 },
  )
  return res.choices[0]?.message?.content?.trim() ?? "No response from model."
}

/**
 * IR-2c — Auto-generated insight cards (4 cards, 1h Redis cache).
 *
 * Cards are derived from `queryFacilityIncidentStats` over a 7- and
 * 30-day window:
 *   - weekly-summary    (this week's total + average completeness)
 *   - location-hotspot  (top incident location over the past 30 days,
 *                        included only when a single location has ≥3)
 *   - repeat-residents  (residents with ≥2 incidents over the past 30 days,
 *                        included only when at least one such resident exists)
 *   - completeness-trend (30-day average completeness + avg active minutes)
 *
 * `location-hotspot` and `repeat-residents` are conditional, so the
 * total card count is between 2 and 4 (within the spec's 3–5 range
 * once at least one optional pattern emerges).
 */
export async function buildOrGetInsights(facilityId: string): Promise<InsightPayload> {
  const cached = await getCachedInsights(facilityId)
  if (cached?.cards?.length) {
    return cached
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [weekStats, monthStats] = await Promise.all([
    queryFacilityIncidentStats(facilityId, sevenDaysAgo, now),
    queryFacilityIncidentStats(facilityId, thirtyDaysAgo, now),
  ])

  const cards: InsightCard[] = []

  cards.push({
    id: "weekly-summary",
    title: "This Week",
    body: `${weekStats.total} incident${weekStats.total === 1 ? "" : "s"} reported this week. Average completeness: ${weekStats.avgCompleteness}%.`,
  })

  const topLocationEntry = Object.entries(monthStats.byLocation).sort(
    ([, a], [, b]) => b - a,
  )[0]
  if (topLocationEntry && topLocationEntry[1] >= 3) {
    const [loc, count] = topLocationEntry
    cards.push({
      id: "location-hotspot",
      title: "Location Pattern",
      body: `${loc} has had ${count} incidents in the past 30 days — highest in the facility.`,
    })
  }

  const repeatResidents = monthStats.byResident.filter((r) => r.count >= 2)
  if (repeatResidents.length > 0) {
    cards.push({
      id: "repeat-residents",
      title: "Residents with Multiple Incidents",
      body: `${repeatResidents
        .map(
          (r) =>
            `${r.residentName || "Unknown"}${
              r.residentRoom ? ` (Room ${r.residentRoom})` : ""
            }: ${r.count} incidents`,
        )
        .join(". ")}. Consider care plan review.`,
    })
  }

  cards.push({
    id: "completeness-trend",
    title: "Documentation Quality",
    body:
      monthStats.total > 0
        ? `Average report completeness: ${monthStats.avgCompleteness}% (30-day, ${monthStats.total} report${monthStats.total === 1 ? "" : "s"}). Average data collection time: ${Math.round(monthStats.avgActiveSeconds / 60)} minutes per report.`
        : "Not enough incidents in the last 30 days to measure a trend.",
  })

  const out: InsightPayload = {
    facilityId,
    generatedAt: new Date().toISOString(),
    cards,
  }
  await getRedis().set(insKey(facilityId), JSON.stringify(out), "EX", INSIGHTS_TTL_SEC)
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

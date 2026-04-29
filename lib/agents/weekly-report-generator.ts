/**
 * Weekly Intelligence Report Generator — IR-3b
 *
 * Produces an unprompted, week-over-week intelligence report for a
 * facility. Combines deterministic statistics from
 * `queryFacilityIncidentStats` with optional LLM-written narrative
 * sections (graceful fallback when the OpenAI key is absent or the
 * call fails).
 *
 * The cron handler (app/api/cron/weekly-report/route.ts) invokes this
 * for every active facility.
 */

import {
  queryFacilityIncidentStats,
  type FacilityIncidentStats,
} from "@/lib/agents/vector-search"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"

export interface WeeklyReportSections {
  atAGlance: {
    incidentsThisWeek: number
    incidentsLastWeek: number
    investigationsClosed: number
    avgCompleteness: number
    avgCompletenessLastWeek: number
  }
  /** LLM (or fallback) paragraph about the documentation-quality trend. */
  completenessNarrative: string
  /** Plain-language anomaly flags. */
  attentionNeeded: string[]
  /** LLM (or fallback) paragraph about staff documentation performance. */
  staffPerformance: string
}

export interface WeeklyReport {
  facilityId: string
  generatedAt: string
  weekStart: string
  weekEnd: string
  sections: WeeklyReportSections
  rawData: {
    thisWeek: FacilityIncidentStats
    lastWeek: FacilityIncidentStats
  }
}

async function countInvestigationsClosedThisWeek(
  facilityId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<number> {
  try {
    await connectMongo()
    return await IncidentModel.countDocuments({
      facilityId,
      "phaseTransitionTimestamps.phase2Locked": { $gte: weekStart, $lte: weekEnd },
    })
  } catch {
    return 0
  }
}

async function llmNarrative(
  systemPrompt: string,
  userPrompt: string,
  fallback: string,
): Promise<string> {
  if (!isOpenAIConfigured()) return fallback
  try {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]
    const completion = await generateChatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 200,
    })
    const content = completion.choices[0]?.message?.content?.trim()
    return content && content.length > 0 ? content : fallback
  } catch {
    return fallback
  }
}

export async function generateWeeklyReport(
  facilityId: string,
  now: Date = new Date(),
): Promise<WeeklyReport> {
  const weekEnd = now
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [thisWeek, lastWeek, investigationsClosed] = await Promise.all([
    queryFacilityIncidentStats(facilityId, weekStart, weekEnd),
    queryFacilityIncidentStats(facilityId, prevWeekStart, weekStart),
    countInvestigationsClosedThisWeek(facilityId, weekStart, weekEnd),
  ])

  const atAGlance = {
    incidentsThisWeek: thisWeek.total,
    incidentsLastWeek: lastWeek.total,
    investigationsClosed,
    avgCompleteness: thisWeek.avgCompleteness,
    avgCompletenessLastWeek: lastWeek.avgCompleteness,
  }

  const attentionNeeded: string[] = []

  for (const [loc, count] of Object.entries(thisWeek.byLocation)) {
    if (count >= 3 && loc !== "unknown") {
      attentionNeeded.push(
        `${loc} has had ${count} incidents this week — above normal. Consider an environmental review.`,
      )
    }
  }

  for (const resident of thisWeek.byResident) {
    if (resident.count >= 2 && resident.residentName) {
      const room = resident.residentRoom ? ` (Room ${resident.residentRoom})` : ""
      attentionNeeded.push(
        `${resident.residentName}${room} had ${resident.count} incidents this week. Care plan review recommended.`,
      )
    }
  }

  if (
    lastWeek.avgCompleteness > 0 &&
    thisWeek.avgCompleteness > 0 &&
    thisWeek.avgCompleteness < lastWeek.avgCompleteness - 10
  ) {
    attentionNeeded.push(
      `Documentation completeness dropped from ${lastWeek.avgCompleteness}% to ${thisWeek.avgCompleteness}% this week. Consider a staff refresher on thorough initial narratives.`,
    )
  }

  const context = `FACILITY WEEKLY DATA:
This week: ${thisWeek.total} incidents, avg completeness ${thisWeek.avgCompleteness}%, avg collection time ${Math.round(thisWeek.avgActiveSeconds / 60)} min
Last week: ${lastWeek.total} incidents, avg completeness ${lastWeek.avgCompleteness}%
Types this week: ${Object.entries(thisWeek.byType).map(([k, v]) => `${k}: ${v}`).join(", ") || "none"}
Top locations: ${Object.entries(thisWeek.byLocation).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ") || "none"}
Repeat residents: ${thisWeek.byResident.filter((r) => r.count >= 2).map((r) => `${r.residentName}: ${r.count}`).join(", ") || "none"}`

  const completenessFallback = `Average completeness this week: ${thisWeek.avgCompleteness}% (last week: ${lastWeek.avgCompleteness}%).`
  const staffFallback = `${thisWeek.total} report${thisWeek.total === 1 ? "" : "s"} completed this week across all staff.`

  const [completenessNarrative, staffPerformance] = await Promise.all([
    llmNarrative(
      "You are WAiK Intelligence writing a weekly report for a senior care facility administrator. Write a 2-3 sentence assessment of the documentation quality trend. Be professional, concise, and actionable. If things are improving, say so. If declining, identify the likely cause.",
      `Based on this data, assess the documentation quality trend:\n${context}`,
      completenessFallback,
    ),
    llmNarrative(
      "You are WAiK Intelligence. Write a 2-3 sentence summary of staff documentation performance. Highlight that staff overall improved or held steady when applicable. Note coaching opportunities without naming specific staff members negatively.",
      `Based on this facility data, assess staff performance:\n${context}`,
      staffFallback,
    ),
  ])

  return {
    facilityId,
    generatedAt: now.toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    sections: {
      atAGlance,
      completenessNarrative,
      attentionNeeded,
      staffPerformance,
    },
    rawData: { thisWeek, lastWeek },
  }
}

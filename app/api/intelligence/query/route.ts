/**
 * IR-2c — Facility-wide Intelligence Q&A endpoint.
 *
 * Cross-incident natural-language Q&A scoped to a single facility. Staff
 * tier users always run in "personal" scope (only their own incidents);
 * admin tier users default to "facility" scope but may opt into
 * "personal" via the request body.
 *
 * Returns a plain-language answer plus the citations (incidents) that
 * informed it. Reference: WAiK_Incident_Reporting_Blueprint.md § 6.
 */

import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  searchFacilityIncidents,
  queryFacilityIncidentStats,
  type SearchFilters,
} from "@/lib/agents/vector-search"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import { isAdminRole } from "@/lib/waik-roles"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

interface QueryBody {
  question?: string
  scope?: "personal" | "facility"
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!user.facilityId) {
    return NextResponse.json({ error: "Facility required" }, { status: 400 })
  }

  let body: QueryBody
  try {
    body = (await request.json()) as QueryBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const question = (body.question ?? "").trim()
  if (!question) {
    return NextResponse.json({ error: "Question required" }, { status: 400 })
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "Question too long" }, { status: 400 })
  }

  const isAdmin = isAdminRole(user.roleSlug)
  const requestedPersonal = body.scope === "personal"
  // Staff tier is always pinned to personal scope; admin tier may opt in.
  const effectiveScope: "personal" | "facility" =
    !isAdmin || requestedPersonal ? "personal" : "facility"

  const filters: SearchFilters | undefined =
    effectiveScope === "personal" ? { staffId: user.userId } : undefined

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "Intelligence is not configured (missing OPENAI_API_KEY)" },
      { status: 503 },
    )
  }

  try {
    const searchResults = await searchFacilityIncidents(
      user.facilityId,
      question,
      10,
      filters,
    )

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const stats = await queryFacilityIncidentStats(
      user.facilityId,
      thirtyDaysAgo,
      now,
    )

    const incidentContext = searchResults.results
      .map((r, i) =>
        [
          `[Incident ${i + 1}] ${r.incidentType} — ${r.residentName} (Room ${r.residentRoom})`,
          `Date: ${r.incidentDate ? r.incidentDate.split("T")[0] : "unknown"} | Location: ${r.location}`,
          `Completeness: ${r.completenessScore}% | Phase: ${r.phase}`,
          `Summary: ${r.snippet}`,
        ].join("\n"),
      )
      .join("\n\n")

    const statsContext = [
      "FACILITY STATS (last 30 days):",
      `Total incidents: ${stats.total}`,
      `By type: ${formatCounts(stats.byType)}`,
      `By location: ${formatCounts(stats.byLocation)}`,
      `Avg completeness: ${stats.avgCompleteness}%`,
      `Residents with most incidents: ${
        stats.byResident
          .slice(0, 3)
          .map((r) => `${r.residentName} (${r.count})`)
          .join(", ") || "—"
      }`,
    ].join("\n")

    const systemPrompt = [
      "You are WAiK Intelligence — an institutional memory system for a senior care facility.",
      "You answer questions about incident history, patterns, and clinical documentation using ONLY the data provided below.",
      "If the data does not contain enough information to answer the question, say so clearly. Do not speculate or invent data.",
      "Respond in clear, concise, professional language (2–6 sentences, plain text, no markdown). When referencing specific incidents, cite them by resident name and date.",
      `SCOPE: ${
        effectiveScope === "personal"
          ? "This staff member's own reports only."
          : "All facility incidents."
      }`,
    ].join("\n")

    const userPrompt = `QUESTION: ${question}

═══ RELEVANT INCIDENTS ═══
${incidentContext || "No relevant incidents found."}

═══ AGGREGATE STATISTICS ═══
${statsContext}

Answer the question based on the above data.`

    const completion = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 800 },
    )

    const answer =
      completion.choices[0]?.message?.content?.trim() ??
      "No response from model."

    return NextResponse.json({
      answer,
      citations: searchResults.results.slice(0, 5).map((r) => ({
        incidentId: r.incidentId,
        residentName: r.residentName,
        incidentDate: r.incidentDate,
        location: r.location,
        snippet: r.snippet,
        similarityScore: r.similarityScore,
      })),
      scope: effectiveScope,
      searchMethod: searchResults.searchMethod,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[intelligence/query] Error:", error)
    return NextResponse.json(
      { error: "Intelligence query failed" },
      { status: 500 },
    )
  }
}

function formatCounts(map: Record<string, number>): string {
  const entries = Object.entries(map)
  if (entries.length === 0) return "—"
  return entries
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")
}

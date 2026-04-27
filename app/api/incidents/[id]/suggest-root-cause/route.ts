import { NextResponse } from "next/server"
import { loadPhase2Incident } from "@/lib/phase2-server"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

const MAX_CITE = 2500

/**
 * Suggest root-cause text for Phase 2 using only this incident’s on-record fields
 * (same facility as the document; no cross-facility context).
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = await context.params
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Set OPENAI_API_KEY in the environment." },
      { status: 503 },
    )
  }
  const r = await loadPhase2Incident(incidentId)
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  const { doc } = r
  const ph = String(doc["phase"] ?? "")
  if (ph === "closed") {
    return NextResponse.json({ error: "This investigation is closed." }, { status: 400 })
  }

  const description = String(doc["description"] ?? "")
  const incidentType = String(doc["incidentType"] ?? "Incident")
  const room = String(doc["residentRoom"] ?? "")
  const p2 = doc["phase2Sections"] as { contributingFactors?: { factors?: string[]; notes?: string } } | undefined
  const factors = (p2?.contributingFactors?.factors ?? []).join("; ")
  const initial = doc["initialReport"] as { narrative?: string } | undefined
  const narrative = (initial?.narrative ?? description).slice(0, MAX_CITE)
  if (!narrative.trim() && !description.trim()) {
    return NextResponse.json(
      { error: "Not enough on-record text to base a suggestion on. Add a narrative in Phase 1 first." },
      { status: 400 },
    )
  }

  const system =
    "You are a long-term care incident analyst. Propose a root-cause paragraph (2–4 sentences) that a DON could use as a starting point. Be conservative; if information is missing, state what is unknown. No markdown, no bullet list."
  const user = [
    `Type: ${incidentType} — Room ${room}.`,
    factors ? `Documented contributing factors: ${factors}.` : "",
    p2?.contributingFactors?.notes
      ? `Section notes: ${p2.contributingFactors.notes}`.slice(0, 800)
      : "",
    `Narrative excerpt:\n${narrative}`.trim(),
  ]
    .filter(Boolean)
    .join("\n\n")

  const completion = await generateChatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.3, maxTokens: 500 },
  )
  const text = (completion.choices[0]?.message?.content ?? "").trim()
  if (!text) {
    return NextResponse.json({ error: "Model returned no text" }, { status: 500 })
  }

  return NextResponse.json({ text }, { status: 200 })
}

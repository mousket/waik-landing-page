/**
 * Coaching Tips Generator — IR-2e
 *
 * Produces 2–3 short, encouraging, *specific* coaching tips for the
 * report card shown after sign-off. References the Gold Standard
 * fields the nurse captured up front (positive reinforcement) and the
 * fields they missed entirely (actionable next-step), and compares to
 * personal/facility averages.
 *
 * Best-effort: any LLM/JSON failure falls back to deterministic tips
 * so the report card is always populated.
 */

import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export interface CoachingInput {
  completenessScore: number
  completenessAtTier1: number
  /** Gold Standard fields not captured by the end of the report. */
  missedFields: string[]
  /** Fields captured in the initial narrative (Tier 1 only) — these get rewarded. */
  capturedInTier1: string[]
  totalQuestionsAsked: number
  personalAverage: number
  facilityAverage: number
  incidentType: string
}

const SYSTEM_PROMPT = `You are a supportive clinical documentation coach.
Generate 2-3 brief, specific, actionable coaching tips for a nurse who
just completed an incident report. Be encouraging, not critical.

Focus on:
1. What they did well (fields captured in their initial narrative)
2. What they can improve next time (specific fields they missed)
3. How they compare to facility average (only mention if they are above)

Each tip: 1-2 sentences. No bullet points or numbering in the text.
Return ONLY a JSON object: { "tips": ["tip1", "tip2", "tip3"] }`

export async function generateCoachingTips(
  input: CoachingInput,
): Promise<string[]> {
  if (!isOpenAIConfigured()) {
    return fallbackTips(input)
  }

  const userPrompt = `REPORT SUMMARY:
Incident type: ${input.incidentType}
Completeness: ${input.completenessScore}%
Completeness after initial narrative only: ${input.completenessAtTier1}%
Personal average: ${input.personalAverage}%
Facility average: ${input.facilityAverage}%
Total follow-up questions needed: ${input.totalQuestionsAsked}

Fields captured in initial narrative (without being asked): ${input.capturedInTier1.join(", ") || "none"}
Fields that were missed entirely: ${input.missedFields.join(", ") || "none"}

Generate 2-3 coaching tips.`

  try {
    const completion = await generateChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.3,
        maxTokens: 400,
        response_format: { type: "json_object" },
      },
    )

    const raw = completion.choices[0]?.message?.content
    if (!raw) return fallbackTips(input)

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned) as { tips?: unknown }
    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.filter(
          (t): t is string => typeof t === "string" && t.trim().length > 0,
        )
      : []

    if (tips.length === 0) return fallbackTips(input)
    return tips.slice(0, 3)
  } catch (error) {
    console.error("[coaching-tips] Failed:", error)
    return fallbackTips(input)
  }
}

function fallbackTips(input: CoachingInput): string[] {
  const tips: string[] = []

  if (input.completenessScore >= 85) {
    tips.push(
      "Excellent report — thorough and clinically complete. Keep that level of detail in your opening narrative.",
    )
  } else if (input.completenessAtTier1 >= 40) {
    tips.push(
      "Strong opening — your initial narrative covered many of the required fields before any follow-up questions.",
    )
  } else {
    tips.push(
      "Try to include environment details, footwear, and any recent medication or care-plan changes in your opening narrative — that reduces follow-up questions.",
    )
  }

  if (input.missedFields.length > 0) {
    const sample = input.missedFields.slice(0, 3).map(humanizeField).join(", ")
    tips.push(
      `Next time, watch for: ${sample}. Capturing these up front speeds up sign-off.`,
    )
  }

  if (
    input.facilityAverage > 0 &&
    input.completenessScore > input.facilityAverage
  ) {
    tips.push(
      `You're scoring above the facility average (${input.completenessScore}% vs ${input.facilityAverage}%). Nice work.`,
    )
  }

  return tips.length > 0
    ? tips.slice(0, 3)
    : ["Report saved — every completed incident strengthens the facility record."]
}

function humanizeField(field: string): string {
  return field.replace(/_/g, " ")
}

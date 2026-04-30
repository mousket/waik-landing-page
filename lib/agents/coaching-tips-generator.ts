import { AI_CONFIG, generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export interface CoachingInput {
  completenessScore: number
  completenessAtTier1: number
  missedFields: string[]
  capturedInTier1: string[]
  totalQuestionsAsked: number
  personalAverage: number
  facilityAverage: number
  incidentType: string
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
}

function fallbackTips(input: CoachingInput): string[] {
  if (input.completenessScore >= 85) {
    return ["Excellent report — thorough and clinically complete."]
  }
  return [
    "Next time, try to include environment, footwear, and medication context in your opening narrative to reduce follow-up questions.",
  ]
}

/**
 * 2–3 short LLM coaching strings for the report card. Falls back if OpenAI is off or parsing fails.
 */
export async function generateCoachingTips(input: CoachingInput): Promise<string[]> {
  if (!isOpenAIConfigured()) {
    return fallbackTips(input)
  }

  const systemPrompt = `You are a supportive clinical documentation coach.
Generate 2-3 brief, specific, actionable coaching tips for a nurse who
just completed an incident report. Be encouraging, not critical.

Focus on:
1. What they did well (fields captured in their initial narrative)
2. What they can improve next time (specific fields they missed)
3. How they compare to facility average (only mention if they are above)

Each tip: 1-2 sentences. No bullet points or numbering in the text.
Return ONLY valid JSON: { "tips": ["tip1", "tip2"] } with 2-3 strings in "tips".`

  const userPrompt = `REPORT SUMMARY:
Incident type: ${input.incidentType}
Completeness: ${input.completenessScore}%
Completeness after initial narrative only: ${input.completenessAtTier1}%
Personal average: ${input.personalAverage}%
Facility average: ${input.facilityAverage}%
Total follow-up questions asked: ${input.totalQuestionsAsked}

Fields captured early (filled before heavy follow-up): ${input.capturedInTier1.join(", ") || "none listed"}
Fields still missing from gold standard at sign-off: ${input.missedFields.join(", ") || "none listed"}

Generate 2-3 coaching tips as JSON.`

  try {
    const res = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.3,
        maxTokens: 400,
        model: AI_CONFIG.model,
        response_format: { type: "json_object" },
      },
    )
    const text = res.choices[0]?.message?.content?.trim()
    if (!text) {
      return fallbackTips(input)
    }
    const parsed = JSON.parse(stripJsonFences(text)) as { tips?: unknown }
    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : []
    if (tips.length === 0) {
      return fallbackTips(input)
    }
    return tips.slice(0, 5)
  } catch {
    return fallbackTips(input)
  }
}

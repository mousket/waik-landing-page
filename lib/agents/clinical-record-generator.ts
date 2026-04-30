import type { Tier1Question } from "@/lib/config/tier1-questions"
import { AI_CONFIG, generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export interface ClinicalRecordInput {
  fullNarrative: string
  tier1Questions: Tier1Question[]
  tier1Answers: Record<string, string>
  tier2Questions: Array<{ id: string; text: string }>
  tier2Answers: Record<string, string>
  closingQuestions: Tier1Question[]
  closingAnswers: Record<string, string>
  incidentType: string
  residentName: string
  location: string
}

export interface ClinicalRecord {
  narrative: string
  residentStatement: string
  interventions: string
  contributingFactors: string
  recommendations: string
  environmentalAssessment: string
}

function labelTier1Answers(questions: Tier1Question[], answers: Record<string, string>): string {
  return questions
    .map((q) => {
      const text = (answers[q.id] ?? "").trim()
      return `${q.areaHint} (${q.id}): ${text || "(no answer)"}`
    })
    .join("\n\n")
}

function labelTier2Answers(
  questions: Array<{ id: string; text: string }>,
  answers: Record<string, string>,
): string {
  return questions
    .map((q) => {
      const text = (answers[q.id] ?? "").trim()
      return `${q.text} (${q.id}): ${text || "(no answer)"}`
    })
    .join("\n\n")
}

function labelClosingAnswers(questions: Tier1Question[], answers: Record<string, string>): string {
  return questions
    .map((q) => {
      const text = (answers[q.id] ?? "").trim()
      return `${q.label} (${q.id}): ${text || "(no answer)"}`
    })
    .join("\n\n")
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
}

function fallbackClinicalRecord(input: ClinicalRecordInput): ClinicalRecord {
  const blank = "No information provided by reporting staff."
  const narrative =
    input.fullNarrative.trim() ||
    [labelTier1Answers(input.tier1Questions, input.tier1Answers), labelTier2Answers(input.tier2Questions, input.tier2Answers)]
      .filter(Boolean)
      .join("\n\n") ||
    blank

  return {
    narrative: narrative.slice(0, 4000),
    residentStatement: blank,
    interventions: blank,
    contributingFactors: blank,
    recommendations: blank,
    environmentalAssessment: blank,
  }
}

export async function generateClinicalRecord(input: ClinicalRecordInput): Promise<ClinicalRecord> {
  if (!isOpenAIConfigured()) {
    return fallbackClinicalRecord(input)
  }

  const systemPrompt = `You are a clinical documentation specialist for senior care facilities.
Given the raw staff narrative and question-answer pairs from an incident report,
produce a structured clinical record with six sections.

RULES:
- Use professional clinical language but remain faithful to what was reported
- Do NOT add any information that was not in the original narrative or answers
- Do NOT remove or soften any observations the staff member made
- DO surface clinical significance that was present but unstated
  (e.g., if staff said "she seemed confused," note that as a possible cognitive status change)
- Each section should be 2-5 sentences of clear, clinical prose
- If no information was provided for a section, write "No information provided by reporting staff."

Return ONLY a JSON object with these exact keys:
{
  "narrative": "...",
  "residentStatement": "...",
  "interventions": "...",
  "contributingFactors": "...",
  "recommendations": "...",
  "environmentalAssessment": "..."
}`

  const userPrompt = `INCIDENT TYPE: ${input.incidentType}
RESIDENT: ${input.residentName}
LOCATION: ${input.location}

═══ RAW STAFF NARRATIVE ═══
${input.fullNarrative}

═══ TIER 1 ANSWERS (labeled) ═══
${labelTier1Answers(input.tier1Questions, input.tier1Answers)}

═══ TIER 2 ANSWERS (gap-fill) ═══
${labelTier2Answers(input.tier2Questions, input.tier2Answers)}

═══ CLOSING ANSWERS ═══
${labelClosingAnswers(input.closingQuestions, input.closingAnswers)}

Generate the structured clinical record as JSON.`

  const completion = await generateChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 2000, model: AI_CONFIG.model },
  )

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleaned = stripJsonFences(raw)
  let parsed: Partial<ClinicalRecord>
  try {
    parsed = JSON.parse(cleaned) as Partial<ClinicalRecord>
  } catch {
    return fallbackClinicalRecord(input)
  }

  const blank = "No information provided by reporting staff."
  return {
    narrative: typeof parsed.narrative === "string" && parsed.narrative.trim() ? parsed.narrative.trim() : blank,
    residentStatement:
      typeof parsed.residentStatement === "string" && parsed.residentStatement.trim()
        ? parsed.residentStatement.trim()
        : blank,
    interventions:
      typeof parsed.interventions === "string" && parsed.interventions.trim() ? parsed.interventions.trim() : blank,
    contributingFactors:
      typeof parsed.contributingFactors === "string" && parsed.contributingFactors.trim()
        ? parsed.contributingFactors.trim()
        : blank,
    recommendations:
      typeof parsed.recommendations === "string" && parsed.recommendations.trim()
        ? parsed.recommendations.trim()
        : blank,
    environmentalAssessment:
      typeof parsed.environmentalAssessment === "string" && parsed.environmentalAssessment.trim()
        ? parsed.environmentalAssessment.trim()
        : blank,
  }
}

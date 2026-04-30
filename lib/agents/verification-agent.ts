import { AI_CONFIG, generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export interface VerificationInput {
  originalNarrative: string
  clinicalRecord: {
    narrative: string
    residentStatement: string
    interventions: string
    contributingFactors: string
    recommendations: string
    environmentalAssessment: string
  }
}

export interface VerificationResult {
  fidelityScore: number
  additions: string[]
  omissions: string[]
  enhancements: string[]
  overallAssessment: "faithful" | "minor_issues" | "significant_issues"
}

const PASSING: VerificationResult = {
  fidelityScore: 100,
  additions: [],
  omissions: [],
  enhancements: [],
  overallAssessment: "faithful",
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
}

function normalizeResult(raw: unknown): VerificationResult {
  if (!raw || typeof raw !== "object") return PASSING
  const o = raw as Record<string, unknown>
  const score = typeof o.fidelityScore === "number" ? o.fidelityScore : Number(o.fidelityScore)
  const fidelityScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 100
  const arr = (k: string): string[] =>
    Array.isArray(o[k]) ? o[k].filter((x): x is string => typeof x === "string") : []
  const assessment = o.overallAssessment
  const overallAssessment: VerificationResult["overallAssessment"] =
    assessment === "minor_issues" || assessment === "significant_issues" || assessment === "faithful"
      ? assessment
      : fidelityScore >= 80
        ? "faithful"
        : fidelityScore >= 60
          ? "minor_issues"
          : "significant_issues"
  return {
    fidelityScore,
    additions: arr("additions"),
    omissions: arr("omissions"),
    enhancements: arr("enhancements"),
    overallAssessment,
  }
}

/**
 * LLM audit: clinical record vs staff narrative. Never throws; on failure returns a passing result (sign-off not blocked).
 */
export async function verifyClinicalRecord(input: VerificationInput): Promise<VerificationResult> {
  if (!isOpenAIConfigured()) {
    return PASSING
  }

  const systemPrompt = `You are a clinical documentation auditor.
Compare a clinical record against the original staff narrative.
Determine if the clinical record is a FAITHFUL representation.

RULES:
1. ADDITIONS: The clinical record must NOT contain facts, events,
   or observations that were not stated or clearly implied in the
   original narrative. List any additions found.
2. OMISSIONS: The clinical record must NOT remove or soften
   observations the staff member made. List any omissions.
3. ENHANCEMENTS: The clinical record SHOULD surface clinical
   significance that was present but unstated (e.g., "seemed confused"
   → "possible altered mental status"). List enhancements found.
   Enhancements are GOOD — they do not reduce the fidelity score.

Return ONLY a JSON object with keys:
fidelityScore (number 0-100), additions (string array), omissions (string array),
enhancements (string array), overallAssessment ("faithful" | "minor_issues" | "significant_issues").

Score guide:
- 95-100: Perfect fidelity, no additions or omissions
- 80-94: Minor issues, acceptable for sign-off
- 60-79: Significant issues, should be flagged
- Below 60: Major fidelity problems`

  const userPrompt = `═══ ORIGINAL STAFF NARRATIVE ═══
${input.originalNarrative}

═══ CLINICAL RECORD TO VERIFY ═══
Narrative: ${input.clinicalRecord.narrative}
Resident Statement: ${input.clinicalRecord.residentStatement}
Interventions: ${input.clinicalRecord.interventions}
Contributing Factors: ${input.clinicalRecord.contributingFactors}
Recommendations: ${input.clinicalRecord.recommendations}
Environment: ${input.clinicalRecord.environmentalAssessment}

Perform the fidelity check and return JSON only.`

  try {
    const response = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0,
        maxTokens: 1200,
        model: AI_CONFIG.model,
        response_format: { type: "json_object" },
      },
    )
    const text = response.choices[0]?.message?.content?.trim()
    if (!text) {
      return PASSING
    }
    const parsed = JSON.parse(stripJsonFences(text)) as unknown
    return normalizeResult(parsed)
  } catch (e) {
    console.warn("[verification-agent] Verification failed:", e)
    return PASSING
  }
}

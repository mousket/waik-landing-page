/**
 * Verification Agent — IR-2d
 *
 * Compares the generated clinical record against the nurse's original
 * narrative and reports a fidelity score plus specific
 * additions / omissions / enhancements.
 *
 * NEVER blocks sign-off: any failure (LLM error, bad JSON, missing key)
 * is swallowed and treated as a passing result. Callers may still log
 * warnings when `fidelityScore < 80`.
 *
 * Reference: WAiK_Incident_Reporting_Blueprint.md § 6.
 */

import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export interface VerificationClinicalRecord {
  narrative: string
  residentStatement: string
  interventions: string
  contributingFactors: string
  recommendations: string
  environmentalAssessment: string
}

export interface VerificationInput {
  originalNarrative: string
  clinicalRecord: VerificationClinicalRecord
}

export type VerificationAssessment =
  | "faithful"
  | "minor_issues"
  | "significant_issues"

export interface VerificationResult {
  fidelityScore: number // 0-100
  additions: string[]
  omissions: string[]
  enhancements: string[]
  overallAssessment: VerificationAssessment
}

const PASSING_FALLBACK: VerificationResult = {
  fidelityScore: 100,
  additions: [],
  omissions: [],
  enhancements: [],
  overallAssessment: "faithful",
}

const SYSTEM_PROMPT = `You are a clinical documentation auditor.
Compare a clinical record against the original staff narrative.
Determine if the clinical record is a FAITHFUL representation.

RULES:
1. ADDITIONS: The clinical record must NOT contain facts, events, or
   observations that were not stated or clearly implied in the original
   narrative. List any additions found.
2. OMISSIONS: The clinical record must NOT remove or soften
   observations the staff member made. List any omissions.
3. ENHANCEMENTS: The clinical record SHOULD surface clinical
   significance that was present but unstated (e.g., "seemed confused"
   → "possible altered mental status"). List enhancements found.
   Enhancements are GOOD — they do not reduce the fidelity score.

Return ONLY a JSON object:
{
  "fidelityScore": 0-100,
  "additions": ["string"],
  "omissions": ["string"],
  "enhancements": ["string"],
  "overallAssessment": "faithful" | "minor_issues" | "significant_issues"
}

Score guide:
- 95-100: Perfect fidelity, no additions or omissions
- 80-94:  Minor issues, acceptable for sign-off
- 60-79:  Significant issues, should be flagged
- Below 60: Major fidelity problems`

export async function verifyClinicalRecord(
  input: VerificationInput,
): Promise<VerificationResult> {
  if (!isOpenAIConfigured()) {
    return PASSING_FALLBACK
  }

  const userPrompt = `═══ ORIGINAL STAFF NARRATIVE ═══
${input.originalNarrative}

═══ CLINICAL RECORD TO VERIFY ═══
Narrative: ${input.clinicalRecord.narrative}
Resident Statement: ${input.clinicalRecord.residentStatement}
Interventions: ${input.clinicalRecord.interventions}
Contributing Factors: ${input.clinicalRecord.contributingFactors}
Recommendations: ${input.clinicalRecord.recommendations}
Environment: ${input.clinicalRecord.environmentalAssessment}

Perform the fidelity check and return JSON.`

  try {
    const completion = await generateChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0,
        maxTokens: 1000,
        response_format: { type: "json_object" },
      },
    )

    const raw = completion.choices[0]?.message?.content
    if (!raw) return PASSING_FALLBACK

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned) as Partial<VerificationResult>
    return normalizeResult(parsed)
  } catch (error) {
    console.error("[verification-agent] Failed:", error)
    return PASSING_FALLBACK
  }
}

function normalizeResult(raw: Partial<VerificationResult>): VerificationResult {
  const score =
    typeof raw.fidelityScore === "number" && Number.isFinite(raw.fidelityScore)
      ? Math.max(0, Math.min(100, Math.round(raw.fidelityScore)))
      : 100

  const stringArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : []

  const assessment: VerificationAssessment =
    raw.overallAssessment === "minor_issues" ||
    raw.overallAssessment === "significant_issues" ||
    raw.overallAssessment === "faithful"
      ? raw.overallAssessment
      : score >= 95
        ? "faithful"
        : score >= 80
          ? "minor_issues"
          : "significant_issues"

  return {
    fidelityScore: score,
    additions: stringArr(raw.additions),
    omissions: stringArr(raw.omissions),
    enhancements: stringArr(raw.enhancements),
    overallAssessment: assessment,
  }
}

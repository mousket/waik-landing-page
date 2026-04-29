/**
 * Clinical record generator.
 *
 * Takes the raw nurse narrative and labeled answers from a `ReportSession`
 * and produces a six-section structured clinical record suitable for the
 * `initialReport.enhancedNarrative` field of an `IncidentModel`. Used by
 * `app/api/report/complete/route.ts` at sign-off.
 *
 * See documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §2.
 */

import {
  AI_CONFIG,
  generateChatCompletion,
  isOpenAIConfigured,
} from "@/lib/openai"

export interface ClinicalRecordInput {
  fullNarrative: string
  /** Tier 1 answers keyed by question id or label. */
  tier1Answers: Record<string, string>
  /** Tier 2 answers keyed by question id. */
  tier2Answers: Record<string, string>
  /** Closing answers keyed by question id. */
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

const NO_INFO = "No information provided by reporting staff."

const SYSTEM_PROMPT = `You are a clinical documentation specialist for senior care facilities.
Given the raw staff narrative and question-answer pairs from an incident report,
produce a structured clinical record with six sections.

RULES:
- Use professional clinical language but remain faithful to what was reported
- Do NOT add any information that was not in the original narrative or answers
- Do NOT remove or soften any observations the staff member made
- DO surface clinical significance that was present but unstated
  (e.g., if staff said "she seemed confused," note that as a possible cognitive status change)
- Each section should be 2-5 sentences of clear, clinical prose
- If no information was provided for a section, write "${NO_INFO}"

Return ONLY a JSON object with these exact keys:
{
  "narrative": "...",
  "residentStatement": "...",
  "interventions": "...",
  "contributingFactors": "...",
  "recommendations": "...",
  "environmentalAssessment": "..."
}`

function buildUserPrompt(input: ClinicalRecordInput): string {
  const renderAnswers = (answers: Record<string, string>) =>
    Object.entries(answers)
      .filter(([, v]) => v && v.trim().length > 0)
      .map(([k, v]) => `${k}: ${v.trim()}`)
      .join("\n\n") || "(none)"

  return `INCIDENT TYPE: ${input.incidentType}
RESIDENT: ${input.residentName}
LOCATION: ${input.location}

═══ RAW STAFF NARRATIVE ═══
${input.fullNarrative || "(none)"}

═══ TIER 1 ANSWERS (labeled) ═══
${renderAnswers(input.tier1Answers)}

═══ TIER 2 ANSWERS (gap-fill) ═══
${renderAnswers(input.tier2Answers)}

═══ CLOSING ANSWERS ═══
${renderAnswers(input.closingAnswers)}

Generate the structured clinical record as JSON.`
}

function emptyRecord(narrativeFallback: string): ClinicalRecord {
  const narrative =
    narrativeFallback.trim().length > 0 ? narrativeFallback.trim() : NO_INFO
  return {
    narrative,
    residentStatement: NO_INFO,
    interventions: NO_INFO,
    contributingFactors: NO_INFO,
    recommendations: NO_INFO,
    environmentalAssessment: NO_INFO,
  }
}

function parseRecord(raw: string, narrativeFallback: string): ClinicalRecord {
  // Strip markdown code fences if the model emitted them despite json mode.
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return emptyRecord(narrativeFallback)
  }

  if (!parsed || typeof parsed !== "object") {
    return emptyRecord(narrativeFallback)
  }

  const obj = parsed as Record<string, unknown>
  const pick = (k: string): string => {
    const v = obj[k]
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : NO_INFO
  }

  const record: ClinicalRecord = {
    narrative: pick("narrative"),
    residentStatement: pick("residentStatement"),
    interventions: pick("interventions"),
    contributingFactors: pick("contributingFactors"),
    recommendations: pick("recommendations"),
    environmentalAssessment: pick("environmentalAssessment"),
  }

  if (record.narrative === NO_INFO && narrativeFallback.trim().length > 0) {
    record.narrative = narrativeFallback.trim()
  }
  return record
}

export async function generateClinicalRecord(
  input: ClinicalRecordInput,
): Promise<ClinicalRecord> {
  // Offline fallback: when OpenAI is not configured, fall back to the raw
  // narrative. This mirrors how analyze.ts and fill_gaps.ts degrade.
  if (!isOpenAIConfigured()) {
    return emptyRecord(input.fullNarrative)
  }

  try {
    const response = await generateChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
      {
        temperature: 0.2,
        maxTokens: 2000,
        model: AI_CONFIG.model,
        response_format: { type: "json_object" },
      },
    )

    const raw = response.choices[0]?.message?.content ?? ""
    return parseRecord(raw, input.fullNarrative)
  } catch (err) {
    console.error("[clinical-record-generator] generation failed:", err)
    return emptyRecord(input.fullNarrative)
  }
}

export function buildEnhancedNarrative(record: ClinicalRecord): string {
  return [
    `DESCRIPTION OF INCIDENT:\n${record.narrative}`,
    `RESIDENT STATEMENT:\n${record.residentStatement}`,
    `IMMEDIATE INTERVENTIONS:\n${record.interventions}`,
    `CONTRIBUTING FACTORS:\n${record.contributingFactors}`,
    `RECOMMENDATIONS:\n${record.recommendations}`,
    `ENVIRONMENTAL ASSESSMENT:\n${record.environmentalAssessment}`,
  ].join("\n\n")
}

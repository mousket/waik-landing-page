import type { ClinicalRecord, ClinicalRecordInput } from "@/lib/agents/clinical-record-generator"
import { modelForTask, generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"

export type ClinicalPreviewInsights = {
  expertNurseSummary: string
  nurseRecommendations: string
  administratorRecommendations: string
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
}

function buildContextBlock(input: ClinicalRecordInput, clinicalRecord?: ClinicalRecord): string {
  const parts = [
    `INCIDENT TYPE: ${input.incidentType}`,
    `RESIDENT: ${input.residentName}`,
    `LOCATION: ${input.location}`,
    "",
    "STAFF NARRATIVE:",
    input.fullNarrative.trim() || "(none)",
  ]
  if (clinicalRecord?.narrative?.trim()) {
    parts.push("", "STRUCTURED CLINICAL NARRATIVE:", clinicalRecord.narrative.trim())
  }
  if (clinicalRecord?.interventions?.trim()) {
    parts.push("", "DOCUMENTED INTERVENTIONS:", clinicalRecord.interventions.trim())
  }
  if (clinicalRecord?.contributingFactors?.trim()) {
    parts.push("", "CONTRIBUTING FACTORS:", clinicalRecord.contributingFactors.trim())
  }
  return parts.join("\n")
}

function fallbackInsights(
  input: ClinicalRecordInput,
  clinicalRecord: ClinicalRecord,
): ClinicalPreviewInsights {
  const narrative = clinicalRecord.narrative.trim() || input.fullNarrative.trim()
  const summary =
    narrative.length > 0
      ? narrative.length > 480
        ? `${narrative.slice(0, 477).trim()}…`
        : narrative
      : "The reporting nurse documented an incident involving this resident. Review the full record below before signing."

  const nurseRec =
    clinicalRecord.recommendations.trim() &&
    clinicalRecord.recommendations !== "No information provided by reporting staff."
      ? clinicalRecord.recommendations
      : "Continue monitoring the resident per care plan. Document any changes in condition and notify the charge nurse of new concerns."

  const adminRec =
    clinicalRecord.contributingFactors.trim() &&
    clinicalRecord.contributingFactors !== "No information provided by reporting staff."
      ? `Review contributing factors with the IDT and confirm care-plan updates are documented. ${clinicalRecord.contributingFactors}`
      : "Ensure the incident is routed for Phase 2 review, care-plan cross-check, and regulatory documentation as required by facility policy."

  return {
    expertNurseSummary: summary,
    nurseRecommendations: nurseRec,
    administratorRecommendations: adminRec,
  }
}

export async function generateClinicalPreviewInsights(
  input: ClinicalRecordInput,
  clinicalRecord: ClinicalRecord,
): Promise<ClinicalPreviewInsights> {
  if (!isOpenAIConfigured()) {
    return fallbackInsights(input, clinicalRecord)
  }

  const systemPrompt = `You are an experienced registered nurse reviewing a senior-care incident report before sign-off.

Write three sections for the reporting nurse and leadership. Use clear, calm clinical language.
Ground every statement in the provided narrative and structured record — do not invent facts.

Return ONLY JSON:
{
  "expertNurseSummary": "2-4 sentences summarizing what happened, immediate response, and resident status — written in the voice of a senior nurse briefing the oncoming shift.",
  "nurseRecommendations": "2-4 bullet-style sentences (plain text, no markdown bullets) for bedside nursing: monitoring, comfort, communication, and follow-up the floor team should do.",
  "administratorRecommendations": "2-4 bullet-style sentences (plain text) for DON/administrator: IDT review, care-plan updates, compliance, family notification, and Phase 2 investigation priorities."
}`

  const userPrompt = buildContextBlock(input, clinicalRecord)

  try {
    const completion = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.25, maxTokens: 1200, model: modelForTask("previewInsights") },
    )

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    const parsed = JSON.parse(stripJsonFences(raw)) as Partial<ClinicalPreviewInsights>

    const expertNurseSummary =
      typeof parsed.expertNurseSummary === "string" && parsed.expertNurseSummary.trim()
        ? parsed.expertNurseSummary.trim()
        : fallbackInsights(input, clinicalRecord).expertNurseSummary
    const nurseRecommendations =
      typeof parsed.nurseRecommendations === "string" && parsed.nurseRecommendations.trim()
        ? parsed.nurseRecommendations.trim()
        : fallbackInsights(input, clinicalRecord).nurseRecommendations
    const administratorRecommendations =
      typeof parsed.administratorRecommendations === "string" &&
      parsed.administratorRecommendations.trim()
        ? parsed.administratorRecommendations.trim()
        : fallbackInsights(input, clinicalRecord).administratorRecommendations

    return { expertNurseSummary, nurseRecommendations, administratorRecommendations }
  } catch {
    return fallbackInsights(input, clinicalRecord)
  }
}

import { getIncidentById, updateIncident, queueInvestigationQuestions } from "../db"
import type { Incident } from "../types"
import { generateChatCompletion, isOpenAIConfigured } from "../openai"

export type InvestigationAgentEvent =
  | { type: "log"; node: string; message: string }
  | { type: "classification"; node: "classify_subtype"; subtype: string }
  | { type: "questions_generated"; node: "queue_questions"; count: number }
  | { type: "error"; node: string; error: string }
  | { type: "complete"; node: "queue_questions"; incidentId: string }

const INVESTIGATION_TEMPLATES: Record<string, string[]> = {
  "fall-wheelchair": [
    "Were the wheelchair brakes engaged prior to the transfer attempt?",
    "Was the resident using any safety belt or lap buddy when seated?",
    "Has the wheelchair been inspected for maintenance issues recently?",
    "Was the cushion positioned correctly before the incident?",
    "Did the resident report discomfort or stiffness in the chair during earlier checks?",
    "Who assisted the resident with transfers earlier in the day?",
    "Was the footrest raised or removed before the resident tried to stand?",
    "Has physical therapy evaluated the resident's wheelchair fit in the last 30 days?",
  ],
  "fall-bed": [
    "Was the bed in a lowered position when the fall occurred?",
    "Were side rails used or available for this resident?",
    "What assistive devices were near the bedside at the time of the fall?",
    "Did the resident attempt to exit the bed without calling for assistance?",
    "Were bed alarms or motion sensors active?",
    "Has the resident expressed difficulty with transfers from bed recently?",
    "Was there adequate lighting in the resident's room during the incident?",
    "Were non-slip socks or footwear in place before the fall?",
  ],
  "fall-slip": [
    "What was the surface condition where the resident slipped (wet, cluttered, uneven)?",
    "Was appropriate footwear being worn by the resident?",
    "Were grab bars or handrails available within reach?",
    "Did housekeeping recently service the area where the fall occurred?",
    "Was there adequate lighting in the area at the time?",
    "Was the resident carrying any objects that may have impacted balance?",
    "Have there been prior slip incidents in this location?",
    "Did the resident receive gait assistance or supervision during ambulation?",
  ],
  "fall-lift": [
    "What type of lift or transfer aid was used during the incident?",
    "Was a second staff member present during the transfer?",
    "Were lift slings inspected before the transfer?",
    "Did the resident express discomfort or fear during transfers recently?",
    "Was staff trained on the specific lift equipment involved?",
    "Were lift weight limits or safety indicators exceeded?",
    "Was the resident's care plan followed for transfers?",
    "Were there any equipment malfunctions noted during or after the transfer?",
  ],
  "fall-unknown": [
    "Where exactly did the incident occur and what was the resident attempting to do?",
    "Was the resident alone or supervised at the time?",
    "Were there any environmental hazards present (clutter, spills, poor lighting)?",
    "Has the resident reported dizziness, weakness, or other symptoms recently?",
    "Were prescribed mobility aids within reach and in good condition?",
    "Have there been recent medication changes that might impact balance?",
    "Has the resident had previous falls or near misses in the past 30 days?",
    "Was the resident wearing appropriate footwear?",
  ],
}

const SUBTYPE_OPTIONS = [
  "fall-wheelchair",
  "fall-bed",
  "fall-slip",
  "fall-lift",
  "fall-unknown",
] as const

export async function* runInvestigationAgent(incidentId: string): AsyncGenerator<InvestigationAgentEvent> {
  try {
    yield { type: "log", node: "load_and_analyze", message: "Loading incident data" }

    const incident = await getIncidentById(incidentId)

    if (!incident) {
      yield {
        type: "error",
        node: "load_and_analyze",
        error: `Incident ${incidentId} not found`,
      }
      return
    }

    yield {
      type: "log",
      node: "load_and_analyze",
      message: `Incident loaded for resident ${incident.residentName}`,
    }

    const subtype = await classifyIncidentSubtype(incident)

    yield {
      type: "classification",
      node: "classify_subtype",
      subtype,
    }

    const now = new Date().toISOString()

    await updateIncident(incident.id, {
      investigation: {
        status: "in-progress",
        subtype,
        startedAt: incident.investigation?.startedAt ?? now,
      },
      updatedAt: now,
    })

    yield {
      type: "log",
      node: "conditional_router",
      message: `Routing to ${subtype} expert question generator`,
    }

    const templates = INVESTIGATION_TEMPLATES[subtype] || INVESTIGATION_TEMPLATES["fall-unknown"]

    const generatedQuestions = await generateExpertQuestions(incident, subtype, templates)

    if (generatedQuestions.length === 0) {
      yield {
        type: "error",
        node: "expert_question_generator",
        error: "No follow-up questions generated",
      }
      yield {
        type: "complete",
        node: "queue_questions",
        incidentId: incident.id,
      }
      return
    }

    const dedupedQuestions = dedupeQuestions(incident, generatedQuestions)

    if (dedupedQuestions.length === 0) {
      yield {
        type: "log",
        node: "de_duplicate_questions",
        message: "All generated questions already exist on the incident",
      }
      yield {
        type: "complete",
        node: "queue_questions",
        incidentId: incident.id,
      }
      return
    }

    yield {
      type: "log",
      node: "queue_questions",
      message: `Queueing ${dedupedQuestions.length} follow-up questions for staff`,
    }

    await queueInvestigationQuestions({
      incidentId: incident.id,
      questions: dedupedQuestions.map((questionText) => ({
        questionText,
        assignedTo: incident.staffId ? [incident.staffId] : undefined,
      })),
      generatedBy: "investigation-agent",
    })

    yield {
      type: "questions_generated",
      node: "queue_questions",
      count: dedupedQuestions.length,
    }

    yield {
      type: "complete",
      node: "queue_questions",
      incidentId: incident.id,
    }
  } catch (error) {
    yield {
      type: "error",
      node: "investigation_agent",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function classifyIncidentSubtype(incident: Incident): Promise<string> {
  if (!isOpenAIConfigured()) {
    return incident.investigation?.subtype || "fall-unknown"
  }

  const prompt = `You are a clinical risk analyst who classifies fall incidents.
Return ONLY one of the following labels:
${SUBTYPE_OPTIONS.join(", ")}

Incident Details:
Resident: ${incident.residentName}
Room: ${incident.residentRoom}
Initial Narrative: ${incident.initialReport?.narrative || incident.description || "(none)"}
Resident State: ${incident.initialReport?.residentState || "(not provided)"}
Environment Notes: ${incident.initialReport?.environmentNotes || "(not provided)"}
Existing Subtype: ${incident.investigation?.subtype || "(unknown)"}

Pick the label that best matches the scenario. If unsure, respond with fall-unknown.`

  try {
    const response = await generateChatCompletion(
      [
        { role: "system", content: "Return only the classification label." },
        { role: "user", content: prompt },
      ],
      { temperature: 0, maxTokens: 10 },
    )

    const raw = response.choices?.[0]?.message?.content?.trim().toLowerCase()

    if (!raw) return incident.investigation?.subtype || "fall-unknown"

    const match = SUBTYPE_OPTIONS.find((option) => raw.includes(option))

    return match || "fall-unknown"
  } catch (error) {
    console.warn("[Investigation Agent] Failed to classify subtype", error)
    return incident.investigation?.subtype || "fall-unknown"
  }
}

async function generateExpertQuestions(
  incident: Incident,
  subtype: string,
  templates: string[],
): Promise<string[]> {
  if (!isOpenAIConfigured()) {
    return templates
  }

  const prompt = `You are assisting in a fall investigation at a care facility. Using the provided incident context and expert template prompts, generate a concise list of follow-up questions that staff should answer. Return the questions as a numbered list with one question per line.

Incident Narrative: ${incident.initialReport?.narrative || incident.description || "(none)"}
Resident State: ${incident.initialReport?.residentState || "(not provided)"}
Environment Notes: ${incident.initialReport?.environmentNotes || "(not provided)"}
Subtype: ${subtype}

Expert Template Questions:
${templates.map((template) => `- ${template}`).join("\n")}

Guidelines:
- Use professional, direct language.
- Tailor the questions using the narrative when possible.
- Focus on actionable information needed to understand causes and prevent recurrence.
- Provide 6-8 questions maximum.
- Do not repeat existing questions verbatim.`

  try {
    const response = await generateChatCompletion(
      [
        { role: "system", content: "Return only the list of questions." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, maxTokens: 500 },
    )

    const content = response.choices?.[0]?.message?.content || ""

    const lines = content
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-\d\.]+\s*/, "").trim())
      .filter(Boolean)

    return lines.length > 0 ? lines : templates
  } catch (error) {
    console.warn("[Investigation Agent] Failed to generate expert questions", error)
    return templates
  }
}

function dedupeQuestions(incident: Incident, questions: string[]): string[] {
  const existing = new Set(
    incident.questions.map((question) => question.questionText.trim().toLowerCase()),
  )

  const deduped: string[] = []
  const seen = new Set<string>()

  questions.forEach((question) => {
    const normalized = question.trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (existing.has(key)) return
    if (seen.has(key)) return
    seen.add(key)
    deduped.push(normalized)
  })

  return deduped
}

import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import type { AgentState, FallSubtypeStandards } from "@/lib/gold_standards"

export interface GapQuestionResult {
  questions: string[]
  missingFields: MissingFieldDescriptor[]
}

export interface MissingFieldDescriptor {
  key: string
  label: string
  context: string
  category: "narrative" | "resident" | "post_fall" | "environment" | "subtype"
}

const GLOBAL_FIELD_DESCRIPTORS: Record<string, MissingFieldDescriptor> = {
  location_of_fall: {
    key: "global.location_of_fall",
    label: "Where the fall occurred",
    context: "Note the exact area such as the room, bathroom, hallway, or dining space.",
    category: "narrative",
  },
  activity_at_time: {
    key: "global.activity_at_time",
    label: "Resident activity",
    context: "Describe what the resident was attempting to do at the moment of the fall.",
    category: "narrative",
  },
  footwear: {
    key: "global.footwear",
    label: "Footwear worn",
    context: "Specify whether the resident had non-slip socks, slippers, shoes, or was barefoot.",
    category: "resident",
  },
  reported_symptoms_pre_fall: {
    key: "global.reported_symptoms_pre_fall",
    label: "Symptoms before fall",
    context: "Mention any dizziness, weakness, pain, or other complaints reported before the fall.",
    category: "resident",
  },
  immediate_injuries_observed: {
    key: "global.immediate_injuries_observed",
    label: "Immediate injuries",
    context: "Include visible bruises, lacerations, swelling, or state if none were observed.",
    category: "post_fall",
  },
  immediate_intervention_in_place: {
    key: "global.immediate_intervention_in_place",
    label: "Immediate intervention",
    context: "Document what was done right away to ensure safety (e.g., vitals, ice pack, supervision).",
    category: "post_fall",
  },
  assistive_device_in_use: {
    key: "global.assistive_device_in_use",
    label: "Assistive device",
    context: "State if the resident used a walker, cane, wheelchair, or no device.",
    category: "environment",
  },
  call_light_in_reach: {
    key: "global.call_light_in_reach",
    label: "Call light accessibility",
    context: "Clarify whether the call light was within reach before the fall.",
    category: "environment",
  },
  resident_statement: {
    key: "global.resident_statement",
    label: "Resident statement",
    context: "Capture what the resident said happened or how they felt after the fall.",
    category: "narrative",
  },
}

const SUBTYPE_FIELD_DESCRIPTORS: Record<FallSubtypeStandards["sub_type_id"], Record<string, MissingFieldDescriptor>> = {
  "fall-bed": {
    resident_position: {
      key: "subtype.resident_position",
      label: "Resident position relative to the bed",
      context: "Describe where the resident was in relation to the bed when found.",
      category: "subtype",
    },
    bed_height: {
      key: "subtype.bed_height",
      label: "Bed height",
      context: "Share if the bed was at the lowest setting, waist height, or another position.",
      category: "subtype",
    },
    bed_rails_status: {
      key: "subtype.bed_rails_status",
      label: "Bed rails",
      context: "Indicate whether bed rails were up, down, or half-raised.",
      category: "subtype",
    },
    floor_mat_present: {
      key: "subtype.floor_mat_present",
      label: "Floor mat presence",
      context: "Note if a floor mat was placed beside the bed.",
      category: "environment",
    },
    assistive_device_nearby: {
      key: "subtype.assistive_device_nearby",
      label: "Assistive devices at bedside",
      context: "Mention if a walker, wheelchair, or cane was within reach.",
      category: "environment",
    },
  },
  "fall-wheelchair": {
    brakes_locked: {
      key: "subtype.brakes_locked",
      label: "Wheelchair brakes",
      context: "Explain whether the wheelchair brakes were locked before the fall.",
      category: "environment",
    },
    cushion_in_place: {
      key: "subtype.cushion_in_place",
      label: "Seat cushion placement",
      context: "State if the wheelchair cushion was correctly positioned.",
      category: "environment",
    },
    footrests_position: {
      key: "subtype.footrests_position",
      label: "Footrest position",
      context: "Clarify if footrests were on, off, or obstructing the resident.",
      category: "subtype",
    },
    chair_tipped_over: {
      key: "subtype.chair_tipped_over",
      label: "Chair tip status",
      context: "Mention whether the wheelchair tipped or shifted.",
      category: "subtype",
    },
  },
  "fall-slip": {
    floor_condition: {
      key: "subtype.floor_condition",
      label: "Floor condition",
      context: "Describe whether the floor was dry, wet, cluttered, or uneven.",
      category: "environment",
    },
    spill_source: {
      key: "subtype.spill_source",
      label: "Spill source",
      context: "Note any liquids or substances that may have caused the slip.",
      category: "environment",
    },
    lighting_level: {
      key: "subtype.lighting_level",
      label: "Lighting",
      context: "Share if the area was well-lit, dim, or dark.",
      category: "environment",
    },
  },
  "fall-lift": {
    lift_type: {
      key: "subtype.lift_type",
      label: "Lift type",
      context: "State whether a Hoyer, sit-to-stand, or other lift was used.",
      category: "subtype",
    },
    staff_assisting_count: {
      key: "subtype.staff_assisting_count",
      label: "Staff assisting",
      context: "Mention how many staff members assisted with the lift.",
      category: "environment",
    },
    sling_condition: {
      key: "subtype.sling_condition",
      label: "Sling condition",
      context: "Describe the sling size, condition, and placement.",
      category: "subtype",
    },
    failure_point: {
      key: "subtype.failure_point",
      label: "Failure point",
      context: "Explain what part of the lift process failed or caused instability.",
      category: "subtype",
    },
  },
}

function isStringMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  return false
}

export function collectMissingFields(state: AgentState): MissingFieldDescriptor[] {
  const missing: MissingFieldDescriptor[] = []
  const global = state.global_standards
  Object.entries(GLOBAL_FIELD_DESCRIPTORS).forEach(([field, descriptor]) => {
    if (isStringMissing((global as any)[field])) {
      missing.push(descriptor)
    }
  })

  if (state.sub_type && state.sub_type_data) {
    const subtypeDescriptors = SUBTYPE_FIELD_DESCRIPTORS[state.sub_type]
    if (subtypeDescriptors) {
      Object.entries(subtypeDescriptors).forEach(([field, descriptor]) => {
        if (isStringMissing((state.sub_type_data as any)[field])) {
          missing.push(descriptor)
        }
      })
    }
  }

  return missing
}

function buildFallbackQuestions(missing: MissingFieldDescriptor[], maxQuestions: number): string[] {
  const chunks: MissingFieldDescriptor[][] = []
  let current: MissingFieldDescriptor[] = []

  missing.forEach((item) => {
    current.push(item)
    if (current.length === 3) {
      chunks.push(current)
      current = []
    }
  })
  if (current.length > 0) chunks.push(current)

  return chunks.slice(0, maxQuestions).map((chunk) => {
    const topics = chunk.map((m) => m.label.toLowerCase()).join(", ")
    return `Could you describe ${topics}?`
  })
}

export interface GapQuestionOptions {
  maxQuestions?: number
  responderName?: string
  subtypeLabel?: string
  previousQuestions?: string[]
  lastAnswer?: string
}

function formatSubtypeLabel(subType?: string | null): string | undefined {
  if (!subType) return undefined
  switch (subType) {
    case "fall-bed":
      return "a bed-related fall"
    case "fall-wheelchair":
      return "a wheelchair-related fall"
    case "fall-slip":
      return "a slip or trip"
    case "fall-lift":
      return "an issue during a lift or transfer"
    default:
      return undefined
  }
}

export async function generateGapQuestions(
  state: AgentState,
  options: GapQuestionOptions = {},
): Promise<GapQuestionResult> {
  const maxQuestions = options.maxQuestions ?? 6
  const missing = collectMissingFields(state)

  if (missing.length === 0) {
    return {
      questions: [],
      missingFields: [],
    }
  }

  if (!isOpenAIConfigured()) {
    return {
      questions: buildFallbackQuestions(missing, maxQuestions),
      missingFields: missing,
    }
  }

  const subtypeLabelFromState = formatSubtypeLabel(state.sub_type)
  const friendlySubtype = options.subtypeLabel ?? subtypeLabelFromState

  const missingList = missing
    .map((field, index) => `${index + 1}. ${field.label} – ${field.context}`)
    .join("\n")

  const categories = missing.reduce<Record<string, number>>((acc, field) => {
    acc[field.category] = (acc[field.category] ?? 0) + 1
    return acc
  }, {})

  const categorySummary = Object.entries(categories)
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ")

  const responderName = options.responderName ? `Use the nurse's name (${options.responderName}) naturally.` : ""
  const subtypeContext = friendlySubtype
    ? `Recognize that the incident appears to be ${friendlySubtype}. Reference this when relevant.`
    : "If the subtype is unclear, include a clarifying question to identify it."
  const continuityHint =
    options.previousQuestions && options.previousQuestions.length > 0
      ? `Do not repeat or paraphrase earlier questions. Already asked: ${options.previousQuestions.join(" | ")}.`
      : ""
  const lastAnswerHint = options.lastAnswer
    ? `The nurse just said: "${options.lastAnswer}". Build directly on this insight.`
    : ""

const systemPrompt = `You are an expert clinical investigator running a focused interview with a nurse.
- Keep a warm, professional tone while staying concise.
- Go straight to the essential question without prefacing statements.
- Bundle multiple related missing data points into a single follow-up question when it makes sense.
- Ask for specifics (measurements, timelines, observations) where useful.
- ${responderName}
- ${subtypeContext}
- ${continuityHint}
- ${lastAnswerHint}
- Vary your sentence structure so every question feels distinct.`

  const desiredQuestionCount = Math.min(
    maxQuestions,
    Math.max(5, missing.length === 0 ? 0 : Math.min(10, missing.length)),
  )

  const userPrompt = `We still need to cover ${missing.length} missing data points from the Gold Standard. Group related ones into a single conversational question.

Missing fields:
${missingList}

Category distribution: ${categorySummary}

Return ${desiredQuestionCount} open-ended questions, each on its own line. Each line must contain only the question itself with no acknowledgements or extra commentary.`

  const response = await generateChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.4,
      maxTokens: 600,
    },
  )

  const content = response.choices[0]?.message?.content || ""
  const questions = content
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, maxQuestions)

  const finalQuestions =
    questions.length > 0
      ? questions
      : buildFallbackQuestions(missing, Math.min(desiredQuestionCount, maxQuestions))

  return {
    questions: finalQuestions,
    missingFields: missing,
  }
}

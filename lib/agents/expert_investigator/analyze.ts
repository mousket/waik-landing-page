import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import {
  AgentState,
  FallSubtypeStandards,
  GoldStandardFallReport,
  FallBedStandards,
  FallWheelchairStandards,
  FallSlipStandards,
  FallLiftStandards,
} from "@/lib/gold_standards"
import { normalizeExtractionFromNarrative } from "@/lib/agents/expert_investigator/extraction-normalizer"

const SCORE_PRECISION = 1

export interface AnalyzerNodeResult {
  state: AgentState
  score: number
  completenessScore: number
  feedback: string
  filledFields: string[]
  missingFields: string[]
  rawModelOutput?: unknown
}

export const DEFAULT_GLOBAL_STATE: GoldStandardFallReport = {
  resident_name: "",
  room_number: "",
  date_of_fall: "",
  time_of_fall: "",
  location_of_fall: "",

  fall_witnessed: null,
  staff_narrative: "",
  resident_statement: "",

  activity_at_time: "",
  footwear: "",
  clothing_issue: null,
  reported_symptoms_pre_fall: "",

  immediate_injuries_observed: "",
  head_impact_suspected: null,
  vitals_taken_post_fall: null,
  neuro_checks_initiated: null,
  physician_notified: null,
  family_notified: null,
  immediate_intervention_in_place: "",

  assistive_device_in_use: "",
  call_light_in_reach: null,
  was_care_plan_followed: null,
}

const GLOBAL_KEYS = Object.keys(DEFAULT_GLOBAL_STATE) as Array<keyof GoldStandardFallReport>

const CRITICAL_FIELDS: Array<{ path: Array<keyof GoldStandardFallReport | "sub_type_data">; label: string }> = [
  { path: ["location_of_fall"], label: "Location of fall" },
  { path: ["footwear"], label: "Type of footwear" },
  { path: ["immediate_injuries_observed"], label: "Immediate injuries observed" },
  { path: ["head_impact_suspected"], label: "Head impact suspected" },
  { path: ["assistive_device_in_use"], label: "Assistive device in use" },
  { path: ["call_light_in_reach"], label: "Call light in reach" },
  { path: ["immediate_intervention_in_place"], label: "Immediate intervention" },
  { path: ["reported_symptoms_pre_fall"], label: "Pre-fall symptoms" },
  { path: ["activity_at_time"], label: "Activity at time of fall" },
  { path: ["resident_statement"], label: "Resident statement" },
]

function createEmptyState(): AgentState {
  return {
    global_standards: { ...DEFAULT_GLOBAL_STATE },
    sub_type: null,
    sub_type_data: null,
  }
}

export function normalizeSubtypeValue(subType: string | null | undefined): AgentState["sub_type"] {
  if (!subType) return null
  const lower = subType.toLowerCase()
  switch (lower) {
    case "fall-bed":
    case "bed":
      return "fall-bed"
    case "fall-wheelchair":
    case "wheelchair":
      return "fall-wheelchair"
    case "fall-slip":
    case "slip":
    case "trip":
      return "fall-slip"
    case "fall-lift":
    case "lift":
      return "fall-lift"
    default:
      return null
  }
}

export function coerceBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["yes", "true", "1", "y"].includes(normalized)) return true
    if (["no", "false", "0", "n"].includes(normalized)) return false
  }
  if (typeof value === "number") {
    if (value === 1) return true
    if (value === 0) return false
  }
  return null
}

export function sanitizeGlobalStandards(input: Partial<GoldStandardFallReport> | undefined): GoldStandardFallReport {
  const base = { ...DEFAULT_GLOBAL_STATE }
  if (!input) return base
  const result: GoldStandardFallReport = { ...base }
  const resultRecord = result as Record<keyof GoldStandardFallReport, string | boolean | null>
  const baseRecord = base as Record<keyof GoldStandardFallReport, string | boolean | null>
  const inputRecord = input as Record<keyof GoldStandardFallReport, unknown>

  for (const key of GLOBAL_KEYS) {
    const baseline = baseRecord[key]
    const incoming = inputRecord[key]
    if (typeof baseline === "boolean" || baseline === null) {
      resultRecord[key] = coerceBoolean(incoming)
    } else {
      resultRecord[key] = typeof incoming === "string" && incoming.trim().length > 0 ? incoming : (baseline as string)
    }
  }

  return resultRecord as GoldStandardFallReport
}

export function sanitizeSubtype(
  subType: AgentState["sub_type"],
  subTypeData: any,
): FallSubtypeStandards | null {
  if (!subType) return null
  switch (subType) {
    case "fall-bed":
      return {
        sub_type_id: "fall-bed",
        resident_position: subTypeData?.resident_position ?? null,
        bed_height: subTypeData?.bed_height ?? null,
        bed_rails_status: subTypeData?.bed_rails_status ?? null,
        floor_mat_present: subTypeData?.floor_mat_present ?? null,
        bolstered_mattress: subTypeData?.bolstered_mattress ?? null,
        obstructions_at_bedside: subTypeData?.obstructions_at_bedside ?? null,
        bed_sheets_on_bed: subTypeData?.bed_sheets_on_bed ?? null,
        assistive_device_nearby: subTypeData?.assistive_device_nearby ?? null,
      } satisfies FallBedStandards
    case "fall-wheelchair":
      return {
        sub_type_id: "fall-wheelchair",
        brakes_locked: subTypeData?.brakes_locked ?? null,
        anti_rollback_device: subTypeData?.anti_rollback_device ?? null,
        cushion_in_place: subTypeData?.cushion_in_place ?? null,
        anti_slip_device_on_seat: subTypeData?.anti_slip_device_on_seat ?? null,
        footrests_position: subTypeData?.footrests_position ?? null,
        armrests_present: subTypeData?.armrests_present ?? null,
        chair_tipped_over: subTypeData?.chair_tipped_over ?? null,
        chair_rolled_or_turned: subTypeData?.chair_rolled_or_turned ?? null,
        resident_position: subTypeData?.resident_position ?? null,
      } satisfies FallWheelchairStandards
    case "fall-slip":
      return {
        sub_type_id: "fall-slip",
        floor_condition: subTypeData?.floor_condition ?? null,
        spill_source: subTypeData?.spill_source ?? null,
        lighting_level: subTypeData?.lighting_level ?? null,
        obstructions_in_path: subTypeData?.obstructions_in_path ?? null,
      } satisfies FallSlipStandards
    case "fall-lift":
      return {
        sub_type_id: "fall-lift",
        lift_type: subTypeData?.lift_type ?? null,
        staff_assisting_count: subTypeData?.staff_assisting_count ?? null,
        policy_requires_two_staff: subTypeData?.policy_requires_two_staff ?? null,
        was_policy_followed: subTypeData?.was_policy_followed ?? null,
        sling_type_and_size: subTypeData?.sling_type_and_size ?? null,
        sling_condition: subTypeData?.sling_condition ?? null,
        sling_attached_correctly: subTypeData?.sling_attached_correctly ?? null,
        resident_cooperation: subTypeData?.resident_cooperation ?? null,
        phase_of_transfer: subTypeData?.phase_of_transfer ?? null,
        failure_point: subTypeData?.failure_point ?? null,
        equipment_removed_from_service: subTypeData?.equipment_removed_from_service ?? null,
      } satisfies FallLiftStandards
    default:
      return null
  }
}

function valueFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "boolean") return true
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return !Number.isNaN(value)
  return false
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word.length === 0 ? "" : word[0].toUpperCase() + word.slice(1)))
    .join(" ")
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^[\-\*\u2022]\s*/, "").trim())
    .filter(Boolean)
}

function firstSentenceContaining(sentences: string[], keywords: string[]): string | null {
  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase())
  for (const sentence of sentences) {
    const loweredSentence = sentence.toLowerCase()
    if (loweredKeywords.some((keyword) => loweredSentence.includes(keyword))) {
      return sentence
    }
  }
  return null
}

function extractLocationPhrase(text: string): string | null {
  const match = text.match(/(?:at|in|inside|by|near)\s+(?:the\s+)?([a-z\s]+?(?:room|table|hall|hallway|bathroom|kitchen|lobby|unit|station|patio|garden|courtyard|nurse station))/i)
  if (match) {
    return toTitleCase(match[1].replace(/\s+/g, " ").trim())
  }
  return null
}

const LOCATION_KEYWORDS: Array<{ regex: RegExp; value: string }> = [
  { regex: /dining|cafeteria|lunch/i, value: "Dining Room" },
  { regex: /bathroom|restroom|toilet/i, value: "Bathroom" },
  { regex: /hallway|corridor/i, value: "Hallway" },
  { regex: /lobby|entrance/i, value: "Lobby" },
  { regex: /bed|bedside/i, value: "Bedside" },
]

const ASSISTIVE_KEYWORDS = ["wheelchair", "walker", "cane", "rollator", "scooter", "crutch", "lift"]

const INTERVENTION_KEYWORDS = [
  "nurse",
  "escorted",
  "took",
  "assessed",
  "applied",
  "monitored",
  "vitals",
  "ice",
  "treated",
  "observed",
  "returned",
  "guided",
]

const SYMPTOM_KEYWORDS = [
  "dizzy",
  "lightheaded",
  "light-headed",
  "nause",
  "weak",
  "headache",
  "tingling",
  "complain",
  "chest pain",
  "shortness of breath",
]

const ACTIVITY_KEYWORDS = ["while", "during", "when", "as she", "as he", "before the fall", "after", "was"]

const STATEMENT_KEYWORDS = ["said", "stated", "told", "mentioned", "reported", "explained", "noted"]

const INJURY_KEYWORDS = ["injur", "cut", "lacer", "bruise", "swelling", "fracture", "bleed", "pain"]

function applyHeuristicExtraction(narrative: string, state: AgentState) {
  if (!narrative || narrative.trim().length === 0) return

  const standards = state.global_standards
  const lower = narrative.toLowerCase()
  const sentences = splitIntoSentences(narrative)

  if (!valueFilled(standards.staff_narrative)) {
    standards.staff_narrative = narrative.trim()
  }

  if (!valueFilled(standards.location_of_fall)) {
    const locationPhrase = extractLocationPhrase(narrative)
    if (locationPhrase) {
      standards.location_of_fall = locationPhrase
    } else {
      const keywordMatch = LOCATION_KEYWORDS.find(({ regex }) => regex.test(lower))
      if (keywordMatch) {
        standards.location_of_fall = keywordMatch.value
      }
    }
  }

  if (!valueFilled(standards.footwear)) {
    const footwearMatch = narrative.match(/(?:wearing|in)\s+(?:a\s+pair\s+of\s+)?((?:non[-\s]?slip\s+)?(?:slippers?|shoes?|sneakers?|boots?|sandals|flip flops|flip-flops|socks|stockings|barefoot))/i)
    if (footwearMatch) {
      standards.footwear = toTitleCase(footwearMatch[1].trim())
    }
  }

  if (!valueFilled(standards.immediate_injuries_observed)) {
    const injurySentence = firstSentenceContaining(sentences, INJURY_KEYWORDS)
    if (injurySentence) {
      standards.immediate_injuries_observed = injurySentence
    }
  }

  if (standards.head_impact_suspected === null) {
    if (/no (?:sign of )?head (?:impact|injury)|denied hitting (?:his|her|their) head/i.test(lower)) {
      standards.head_impact_suspected = false
    } else if (/(hit|struck|banged|impact(?:ed)?)(?:\s+their|\s+her|\s+his|\s+the)?\s+head|head injury|head laceration/i.test(lower)) {
      standards.head_impact_suspected = true
    }
  }

  if (!valueFilled(standards.immediate_intervention_in_place)) {
    const interventionSentence = firstSentenceContaining(sentences, INTERVENTION_KEYWORDS)
    if (interventionSentence) {
      standards.immediate_intervention_in_place = interventionSentence
    }
  }

  if (!valueFilled(standards.reported_symptoms_pre_fall)) {
    const symptomSentence = firstSentenceContaining(sentences, SYMPTOM_KEYWORDS)
    if (symptomSentence) {
      standards.reported_symptoms_pre_fall = symptomSentence
    }
  }

  if (!valueFilled(standards.activity_at_time)) {
    const activitySentence = firstSentenceContaining(sentences, ACTIVITY_KEYWORDS)
    if (activitySentence) {
      standards.activity_at_time = activitySentence
    }
  }

  if (!valueFilled(standards.resident_statement)) {
    const statementSentence = firstSentenceContaining(sentences, STATEMENT_KEYWORDS)
    if (statementSentence) {
      standards.resident_statement = statementSentence
    }
  }

  if (standards.assistive_device_in_use.trim().length === 0) {
    // Policy: do not mark "in use" just because a device is mentioned.
    // Only fill on explicit usage ("ambulating with walker") or explicit non-use ("without device").
    if (
      /(using|ambulating with|walking with|with the help of)\s+(?:a\s+)?(walker|cane)/i.test(lower) ||
      /(in (?:a\s+)?wheelchair|from (?:a\s+)?wheelchair|while in (?:a\s+)?wheelchair)/i.test(lower)
    ) {
      if (/\bwalker\b/i.test(lower)) standards.assistive_device_in_use = "Walker"
      else if (/\bcane\b/i.test(lower)) standards.assistive_device_in_use = "Cane"
      else if (/\bwheelchair\b/i.test(lower)) standards.assistive_device_in_use = "Wheelchair"
    } else if (/without an? assistive device|without (?:any )?device|no assistive device/i.test(lower)) {
      standards.assistive_device_in_use = "None reported"
    }
  }

  if (standards.call_light_in_reach === null) {
    if (/call light (?:was )?(?:within|in) reach|call-light (?:was )?(?:within|in) reach/i.test(lower)) {
      standards.call_light_in_reach = true
    } else if (/call light (?:was )?(?:out of reach|on the floor|not within reach)/i.test(lower)) {
      standards.call_light_in_reach = false
    }
  }

  if (standards.fall_witnessed === null) {
    if (/unwitnessed|was not witnessed|no one witnessed/i.test(lower)) {
      standards.fall_witnessed = false
    } else if (/was witnessed|staff witnessed|caregiver witnessed|observed by/i.test(lower)) {
      standards.fall_witnessed = true
    }
  }

  if (standards.vitals_taken_post_fall === null) {
    if (/vitals? (?:were )?(?:taken|checked|obtained)/i.test(lower)) {
      standards.vitals_taken_post_fall = true
    }
  }

  if (standards.neuro_checks_initiated === null) {
    if (/neuro checks?/i.test(lower)) {
      standards.neuro_checks_initiated = true
    }
  }

  if (standards.physician_notified === null) {
    if (/physician|doctor|provider (?:was )?(?:notified|called|updated)/i.test(lower)) {
      standards.physician_notified = true
    }
  }

  if (standards.family_notified === null) {
    if (/(family|son|daughter|spouse|guardian) (?:was )?(?:notified|called|updated|informed)/i.test(lower)) {
      standards.family_notified = true
    }
  }

  if (standards.was_care_plan_followed === null) {
    if (/care plan (?:was )?followed/i.test(lower)) {
      standards.was_care_plan_followed = true
    } else if (/care plan (?:was )?not followed/i.test(lower)) {
      standards.was_care_plan_followed = false
    }
  }

  // Final conservative normalization pass (subtype + booleans + high-signal cues).
  normalizeExtractionFromNarrative(narrative, state)
}

function clampScore(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 1
  }
  return Math.min(10, Math.max(1, Number(value.toFixed(SCORE_PRECISION))))
}

export function computeCompleteness(state: AgentState) {
  const filled: string[] = []
  const missing: string[] = []

  CRITICAL_FIELDS.forEach(({ path, label }) => {
    let value: unknown = state.global_standards
    for (const segment of path) {
      if (segment === "sub_type_data") {
        value = state.sub_type_data
      } else {
        value = (value as any)?.[segment]
      }
    }

    if (valueFilled(value)) {
      filled.push(label)
    } else {
      missing.push(label)
    }
  })

  const completenessRatio = CRITICAL_FIELDS.length === 0 ? 1 : filled.length / CRITICAL_FIELDS.length
  const completenessScore = clampScore(completenessRatio * 10)

  return { completenessScore, filled, missing }
}

function buildFeedback(input: {
  finalScore: number
  completenessScore: number
  strengths: string[]
  gaps: string[]
}): string {
  const { finalScore, completenessScore, strengths, gaps } = input

  const tone =
    finalScore >= 8
      ? "This was a strong start."
      : finalScore >= 5
        ? "Good foundation—let’s sharpen a few areas."
        : "Thanks for sharing the basics; we’ll round out the rest together."

  const strengthSnippet =
    strengths.length > 0
      ? `Nice work including ${strengths.slice(0, 2).join(", ")}.`
      : "We can build on this to capture the full picture next time."

  const gapTargets =
    gaps.length > 0
      ? `Next time, please try to include ${gaps
          .slice(0, 3)
          .join(", ")}${gaps.length > 3 ? ", and any other critical observations you made." : "."}`
      : "Next time, keep that same level of detail—nothing major was missing."

  return `${tone} Completeness ${completenessScore.toFixed(1)}/10 fed into the ${finalScore.toFixed(
    1,
  )}/10 score. ${strengthSnippet} ${gapTargets}`.trim()
}

const ANALYZER_FUNCTION_DEFINITION = {
  name: "map_incident_narrative_to_gold_standard",
  description:
    "Extracts structured information about a fall incident from a free-form narrative and infers the subtype.",
  parameters: {
    type: "object",
    properties: {
      global_standards: {
        type: "object",
        properties: Object.fromEntries(
          GLOBAL_KEYS.map((key) => [
            key,
            typeof DEFAULT_GLOBAL_STATE[key] === "boolean" ? { type: "boolean" } : { type: "string" },
          ] as const),
        ),
        required: GLOBAL_KEYS,
      },
      sub_type: {
        type: "string",
        description: "Inferred fall subtype identifier (fall-bed, fall-wheelchair, fall-slip, fall-lift)",
      },
      sub_type_data: {
        type: "object",
        description: "Subtype specific attributes. Only include fields relevant to the chosen subtype.",
        additionalProperties: true,
      },
    },
    required: ["global_standards"],
  },
} as const

export async function analyzeNarrativeAndScore(narrative: string, seedState?: AgentState): Promise<AnalyzerNodeResult> {
  const baseState = seedState ?? createEmptyState()

  if (!narrative || narrative.trim().length === 0) {
    const { completenessScore, filled, missing } = computeCompleteness(baseState)
    const finalScore = completenessScore
    return {
      state: baseState,
      score: finalScore,
      completenessScore,
      filledFields: filled,
      missingFields: missing,
      feedback: "No narrative provided. Please share what happened so I can assist you.",
    }
  }

  if (!isOpenAIConfigured()) {
    const fallbackState = {
      ...baseState,
      global_standards: {
        ...baseState.global_standards,
        staff_narrative: narrative,
      },
    }
    applyHeuristicExtraction(narrative, fallbackState)
    const { completenessScore, filled, missing } = computeCompleteness(fallbackState)
    const finalScore = completenessScore
    const feedback = buildFeedback({
      finalScore,
      completenessScore,
      strengths: filled,
      gaps: missing,
    })
    return {
      state: fallbackState,
      score: finalScore,
      completenessScore,
      filledFields: filled,
      missingFields: missing,
      feedback,
    }
  }

  const prompt = `You are an expert clinical investigator. Extract as many structured fields as possible from the following incident narrative. Be concise and only include factual information explicitly stated. If information is missing, leave it empty or null. Also infer the fall subtype (fall-bed, fall-wheelchair, fall-slip, fall-lift) when possible.`

  const response = await generateChatCompletion(
    [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `NARRATIVE:\n${narrative}\n\nReturn the structured result using the provided function schema.`,
      },
    ],
    {
      temperature: 0,
      maxTokens: 1200,
    },
  )

  const message = response.choices[0]?.message
  let mappedState = createEmptyState()
  let rawModelOutput: unknown

  if (message?.function_call?.arguments) {
    try {
      const parsed = JSON.parse(message.function_call.arguments)
      rawModelOutput = parsed
      const sanitizedGlobal = sanitizeGlobalStandards(parsed.global_standards)
      const inferredSubtype = normalizeSubtypeValue(parsed.sub_type)
      const sanitizedSubtype = sanitizeSubtype(inferredSubtype, parsed.sub_type_data)

      mappedState = {
        global_standards: sanitizedGlobal,
        sub_type: inferredSubtype,
        sub_type_data: sanitizedSubtype,
      }
    } catch (error) {
      console.error("[Analyzer] Failed to parse function call arguments", error, message.function_call?.arguments)
    }
  }

  applyHeuristicExtraction(narrative, mappedState)
  const { completenessScore, filled, missing } = computeCompleteness(mappedState)
  const finalScore = completenessScore
  const feedback = buildFeedback({
    finalScore,
    completenessScore,
    strengths: filled,
    gaps: missing,
  })

  return {
    state: mappedState,
    score: finalScore,
    completenessScore,
    feedback,
    filledFields: filled,
    missingFields: missing,
    rawModelOutput,
  }
}

import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import type { AgentState } from "@/lib/gold_standards"
import {
  DEFAULT_GLOBAL_STATE,
  sanitizeGlobalStandards,
  sanitizeSubtype,
  normalizeSubtypeValue,
  computeCompleteness,
  coerceBoolean,
} from "./analyze"
import { collectMissingFields, type MissingFieldDescriptor } from "./gap_questions"

type FieldScope = "global" | "subtype"

interface ParsedFieldMapping {
  scope: FieldScope
  field: string
  type: "string" | "boolean" | "number"
}

export interface FillGapsInput {
  state: AgentState
  answerText: string
  questionText: string
  missingFields?: MissingFieldDescriptor[]
  subTypeHint?: AgentState["sub_type"]
}

export interface FillGapsResult {
  state: AgentState
  updatedFields: string[]
  remainingMissing: MissingFieldDescriptor[]
}

const SUBTYPE_FIELD_TYPE_MAP: Record<string, Record<string, ParsedFieldMapping["type"]>> = {
  "fall-bed": {
    resident_position: "string",
    bed_height: "string",
    bed_rails_status: "string",
    floor_mat_present: "boolean",
    bolstered_mattress: "boolean",
    obstructions_at_bedside: "boolean",
    bed_sheets_on_bed: "boolean",
    assistive_device_nearby: "boolean",
  },
  "fall-wheelchair": {
    brakes_locked: "boolean",
    anti_rollback_device: "boolean",
    cushion_in_place: "boolean",
    anti_slip_device_on_seat: "boolean",
    footrests_position: "string",
    armrests_present: "boolean",
    chair_tipped_over: "boolean",
    chair_rolled_or_turned: "boolean",
    resident_position: "string",
  },
  "fall-slip": {
    floor_condition: "string",
    spill_source: "string",
    lighting_level: "string",
    obstructions_in_path: "boolean",
  },
  "fall-lift": {
    lift_type: "string",
    staff_assisting_count: "number",
    policy_requires_two_staff: "boolean",
    was_policy_followed: "boolean",
    sling_type_and_size: "string",
    sling_condition: "string",
    sling_attached_correctly: "boolean",
    resident_cooperation: "string",
    phase_of_transfer: "string",
    failure_point: "string",
    equipment_removed_from_service: "boolean",
  },
}

function buildFieldMap(
  state: AgentState,
  descriptors: MissingFieldDescriptor[],
): { properties: Record<string, any>; mapping: Record<string, ParsedFieldMapping> } {
  const properties: Record<string, any> = {}
  const mapping: Record<string, ParsedFieldMapping> = {}

  descriptors.forEach((descriptor) => {
    const [scope, field] = descriptor.key.split(".") as [FieldScope, string]
    const propertyKey = `${scope}__${field}`

    let type: ParsedFieldMapping["type"] = "string"

    if (scope === "global") {
      const baseline = DEFAULT_GLOBAL_STATE[field as keyof typeof DEFAULT_GLOBAL_STATE]
      type = typeof baseline === "boolean" ? "boolean" : "string"
    } else if (scope === "subtype") {
      const subType = state.sub_type ?? undefined
      if (subType && SUBTYPE_FIELD_TYPE_MAP[subType]?.[field]) {
        type = SUBTYPE_FIELD_TYPE_MAP[subType][field]
      }
    }

    mapping[propertyKey] = { scope, field, type }
    properties[propertyKey] =
      type === "boolean"
        ? { type: "boolean", description: descriptor.context }
        : type === "number"
          ? { type: "number", description: descriptor.context }
          : { type: "string", description: descriptor.context }
  })

  return { properties, mapping }
}

function coerceValue(value: unknown, type: ParsedFieldMapping["type"]) {
  switch (type) {
    case "boolean":
      return coerceBoolean(value)
    case "number": {
      if (typeof value === "number") return value
      if (typeof value === "string") {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? null : parsed
      }
      return null
    }
    case "string":
    default:
      if (value === null || value === undefined) return ""
      return String(value)
  }
}

function applyParsedValues(
  state: AgentState,
  parsed: Record<string, unknown>,
  mapping: Record<string, ParsedFieldMapping>,
): { state: AgentState; updatedFields: string[] } {
  const updatedFields: string[] = []
  const nextState: AgentState = {
    ...state,
    global_standards: { ...state.global_standards },
    sub_type_data: state.sub_type_data ? { ...state.sub_type_data } : state.sub_type_data,
  }

  for (const [propKey, value] of Object.entries(parsed)) {
    const fieldMeta = mapping[propKey]
    if (!fieldMeta) continue

    const coercedValue = coerceValue(value, fieldMeta.type)
    if (fieldMeta.scope === "global") {
      const key = fieldMeta.field as keyof typeof DEFAULT_GLOBAL_STATE
      ;(nextState.global_standards as any)[key] = coercedValue
      updatedFields.push(`global.${fieldMeta.field}`)
    } else {
      if (!nextState.sub_type_data) {
        const inferredSubType = nextState.sub_type ?? null
        if (inferredSubType) {
          nextState.sub_type_data = sanitizeSubtype(inferredSubType, {}) ?? null
        }
      }
      if (nextState.sub_type_data) {
        ;(nextState.sub_type_data as any)[fieldMeta.field] = coercedValue
        updatedFields.push(`subtype.${fieldMeta.field}`)
      }
    }
  }

  return { state: nextState, updatedFields }
}

export async function fillGapsWithAnswer(input: FillGapsInput): Promise<FillGapsResult> {
  const missingDescriptors = input.missingFields ?? collectMissingFields(input.state)
  if (missingDescriptors.length === 0 || !input.answerText.trim()) {
    const remaining = collectMissingFields(input.state)
    return {
      state: input.state,
      updatedFields: [],
      remainingMissing: remaining,
    }
  }

  if (!isOpenAIConfigured()) {
    const appendedNarrative = `${input.state.global_standards.staff_narrative}\n${input.answerText}`.trim()
    const mergedState: AgentState = {
      ...input.state,
      global_standards: {
        ...input.state.global_standards,
        staff_narrative: appendedNarrative,
      },
    }
    const { completenessScore, filled, missing } = computeCompleteness(mergedState)
    mergedState.score = completenessScore
    mergedState.completenessScore = completenessScore
    mergedState.filledFields = filled
    mergedState.missingFields = missing

    return {
      state: mergedState,
      updatedFields: ["global.staff_narrative"],
      remainingMissing: collectMissingFields(mergedState),
    }
  }

  const { properties, mapping } = buildFieldMap(input.state, missingDescriptors)

  const response = await generateChatCompletion(
    [
      {
        role: "system",
        content:
          "You are an expert clinical investigator. Extract structured data points from the nurse's response. Only fill fields that are directly supported by the answer.",
      },
      {
        role: "user",
        content: `Investigator question: ${input.questionText}\nNurse response: ${input.answerText}\n\nFields to extract: ${missingDescriptors
          .map((descriptor) => `${descriptor.label} (${descriptor.context})`)
          .join("; ")}`,
      },
    ],
    {
      temperature: 0,
      maxTokens: 600,
      tools: [
        {
          type: "function",
          function: {
            name: "update_missing_fields",
            description:
              "Populate any of the missing incident fields that can be confidently inferred from the nurse's response.",
            parameters: {
              type: "object",
              properties,
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "update_missing_fields" } },
    },
  )

  const rawToolCalls = response.choices[0]?.message?.tool_calls
  const toolCall =
    Array.isArray(rawToolCalls) && rawToolCalls.length > 0
      ? rawToolCalls.find((call) => (call as any).function?.arguments)
      : undefined

  const toolArguments = (toolCall as any)?.function?.arguments

  if (!toolArguments) {
    return {
      state: input.state,
      updatedFields: [],
      remainingMissing: collectMissingFields(input.state),
    }
  }

  let parsedArguments: Record<string, unknown> = {}
  try {
    parsedArguments = JSON.parse(toolArguments)
  } catch (error) {
    console.error("[fillGaps] Failed to parse tool arguments", error, toolArguments)
    return {
      state: input.state,
      updatedFields: [],
      remainingMissing: collectMissingFields(input.state),
    }
  }

  const { state: mergedState, updatedFields } = applyParsedValues(input.state, parsedArguments, mapping)

  // Re-sanitize to ensure consistent typing and booleans
  const sanitizedState: AgentState = {
    ...mergedState,
    global_standards: sanitizeGlobalStandards(mergedState.global_standards),
    sub_type: mergedState.sub_type ?? normalizeSubtypeValue(input.subTypeHint ?? mergedState.sub_type),
    sub_type_data: sanitizeSubtype(mergedState.sub_type ?? input.state.sub_type, mergedState.sub_type_data),
  }

  const { completenessScore, filled, missing } = computeCompleteness(sanitizedState)
  sanitizedState.score = completenessScore
  sanitizedState.completenessScore = completenessScore
  sanitizedState.filledFields = filled
  sanitizedState.missingFields = missing

  return {
    state: sanitizedState,
    updatedFields,
    remainingMissing: collectMissingFields(sanitizedState),
  }
}


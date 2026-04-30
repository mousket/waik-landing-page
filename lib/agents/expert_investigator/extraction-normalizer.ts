import type {
  AgentState,
  FallBedStandards,
  FallLiftStandards,
  FallSlipStandards,
  FallSubtypeStandards,
  FallWheelchairStandards,
} from "@/lib/gold_standards"

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0
}

function createBlankSubtypeData(subType: FallSubtypeStandards["sub_type_id"]): FallSubtypeStandards {
  switch (subType) {
    case "fall-bed":
      return {
        sub_type_id: "fall-bed",
        resident_position: null,
        bed_height: null,
        bed_rails_status: null,
        floor_mat_present: null,
        bolstered_mattress: null,
        obstructions_at_bedside: null,
        bed_sheets_on_bed: null,
        assistive_device_nearby: null,
      } satisfies FallBedStandards
    case "fall-wheelchair":
      return {
        sub_type_id: "fall-wheelchair",
        brakes_locked: null,
        anti_rollback_device: null,
        cushion_in_place: null,
        anti_slip_device_on_seat: null,
        footrests_position: null,
        armrests_present: null,
        chair_tipped_over: null,
        chair_rolled_or_turned: null,
        resident_position: null,
      } satisfies FallWheelchairStandards
    case "fall-slip":
      return {
        sub_type_id: "fall-slip",
        floor_condition: null,
        spill_source: null,
        lighting_level: null,
        obstructions_in_path: null,
      } satisfies FallSlipStandards
    case "fall-lift":
      return {
        sub_type_id: "fall-lift",
        lift_type: null,
        staff_assisting_count: null,
        policy_requires_two_staff: null,
        was_policy_followed: null,
        sling_type_and_size: null,
        sling_condition: null,
        sling_attached_correctly: null,
        resident_cooperation: null,
        phase_of_transfer: null,
        failure_point: null,
        equipment_removed_from_service: null,
      } satisfies FallLiftStandards
    default:
      return {
        sub_type_id: "fall-bed",
        resident_position: null,
        bed_height: null,
        bed_rails_status: null,
        floor_mat_present: null,
        bolstered_mattress: null,
        obstructions_at_bedside: null,
        bed_sheets_on_bed: null,
        assistive_device_nearby: null,
      } satisfies FallBedStandards
  }
}

function inferSubtypeFromNarrative(lower: string): FallSubtypeStandards["sub_type_id"] | null {
  // Prefer explicit device contexts first.
  if (/(wheelchair|w\/c\b|geri\s*chair)/i.test(lower)) return "fall-wheelchair"
  if (/(hoyer|sit[-\s]?to[-\s]?stand|mechanical lift|transfer lift)/i.test(lower)) return "fall-lift"
  if (/(slip|trip|spilled|spill|wet floor|uneven surface|cluttered)/i.test(lower)) return "fall-slip"
  if (/(bed|mattress|bedside)/i.test(lower)) return "fall-bed"
  return null
}

/**
 * Deterministic post-processing for analyzer extraction.
 *
 * Goal: fill high-signal Gold Standard fields when the narrative clearly implies them,
 * especially booleans and subtype fields that drive Tier 2 “environment” follow-ups.
 *
 * This should be conservative: only fill when language is unambiguous.
 */
export function normalizeExtractionFromNarrative(narrative: string, state: AgentState): AgentState {
  if (!nonEmpty(narrative)) return state

  const lower = narrative.toLowerCase()
  const gs = state.global_standards

  // --- Subtype inference (conservative) ---
  if (!state.sub_type) {
    const inferred = inferSubtypeFromNarrative(lower)
    if (inferred) {
      state.sub_type = inferred
      state.sub_type_data = createBlankSubtypeData(inferred)
    }
  } else if (!state.sub_type_data) {
    state.sub_type_data = createBlankSubtypeData(state.sub_type)
  }

  // --- Global boolean normalization (only when clear) ---
  if (gs.fall_witnessed === null) {
    if (/(unwitnessed|was not witnessed|no one witnessed)/i.test(lower)) gs.fall_witnessed = false
    else if (/(was witnessed|staff witnessed|observed by)/i.test(lower)) gs.fall_witnessed = true
  }

  if (gs.head_impact_suspected === null) {
    if (
      /(?:no|without)\s+(?:immediate\s+)?(?:visible\s+)?(?:signs?\s+of\s+)?head\s+(?:impact|injur(?:y|ies)|trauma)/i.test(
        lower,
      ) ||
      /no[^.\n]{0,120}\bhead\s+(?:impact|injur(?:y|ies)|trauma)\b/i.test(lower) ||
      /did not hit (?:his|her|their) head/i.test(lower)
    ) {
      gs.head_impact_suspected = false
    } else if (/(hit|struck|banged).{0,24}\bhead\b|head strike|head impact/i.test(lower)) {
      gs.head_impact_suspected = true
    }
  }

  // --- Assistive device “in use” vs “present” ---
  // Policy:
  // - Fill when usage is explicit ("using walker") OR explicit non-use context exists ("walker out of reach").
  // - Do not fill when device is merely mentioned as present with no context.
  if (!nonEmpty(gs.assistive_device_in_use)) {
    const hasWalker = /\bwalker\b/.test(lower)
    const hasCane = /\bcane\b/.test(lower)
    const hasWheelchair = /\bwheelchair\b/.test(lower)
    const hasDevice = hasWalker || hasCane || hasWheelchair

    const explicitUse =
      /(using|ambulating with|walking with|with the help of)\s+(?:a\s+)?(walker|cane)/i.test(lower) ||
      /(in (?:a\s+)?wheelchair|from (?:a\s+)?wheelchair|while in (?:a\s+)?wheelchair)/i.test(lower)

    const outOfReach =
      /(out of (?:his|her|their)\s+reach|out of reach|not within reach|four feet away|several feet away)/i.test(lower) ||
      /(positioned|placed).*(feet away|near the closet|across the room)/i.test(lower)

    if (explicitUse) {
      if (/(walker)/i.test(lower)) gs.assistive_device_in_use = "Walker"
      else if (/(cane)/i.test(lower)) gs.assistive_device_in_use = "Cane"
      else if (/(wheelchair)/i.test(lower)) gs.assistive_device_in_use = "Wheelchair"
    } else if (hasDevice && outOfReach) {
      // Explicit non-use context is still useful: it prevents repetition while staying truthful.
      gs.assistive_device_in_use = hasWalker
        ? "Not in use; walker out of reach"
        : hasCane
          ? "Not in use; cane out of reach"
          : "Not in use; wheelchair out of reach"
    }
  }

  // --- Subtype field extraction (bed / slip focus first) ---
  if (state.sub_type === "fall-bed" && state.sub_type_data?.sub_type_id === "fall-bed") {
    const bed = state.sub_type_data as FallBedStandards

    if (bed.floor_mat_present === null) {
      if (/(fall mat|floor mat).*(not deployed|not (?:in place|present)|absent|was not out|had not been deployed)/i.test(lower)) {
        bed.floor_mat_present = false
      } else if (/(fall mat|floor mat).*(present|in place|deployed|was out)/i.test(lower)) {
        bed.floor_mat_present = true
      }
    }

    if (bed.bed_height === null) {
      if (/(bed).*(lowest|low position|low setting)/i.test(lower)) bed.bed_height = "Lowest position"
      else if (/(bed).*(high|raised)/i.test(lower)) bed.bed_height = "Raised"
    }

    if (bed.bed_rails_status === null) {
      if (/(bed rails?).*(up|raised)/i.test(lower)) bed.bed_rails_status = "Up"
      else if (/(bed rails?).*(down|lowered)/i.test(lower)) bed.bed_rails_status = "Down"
      else if (/(half[-\s]?rails?|one rail)/i.test(lower)) bed.bed_rails_status = "Half"
    }

    if (bed.resident_position === null) {
      const m = lower.match(
        /lying on the floor on the ([a-z\s-]{1,18}) side of (?:(?:the|his|her|their)\s+)?bed/,
      )
      if (m?.[1]) bed.resident_position = `${m[1].trim()} side of bed`
    }

    if (bed.assistive_device_nearby === null) {
      if (/(walker|cane|wheelchair).*(within reach|at bedside|next to (?:the )?bed)/i.test(lower)) bed.assistive_device_nearby = true
      else if (/(walker|cane|wheelchair).*(out of reach|four feet away|near the closet)/i.test(lower)) bed.assistive_device_nearby = false
    }
  }

  if (state.sub_type === "fall-slip" && state.sub_type_data?.sub_type_id === "fall-slip") {
    const slip = state.sub_type_data as FallSlipStandards

    if (slip.floor_condition === null) {
      if (/(floor).*(dry|not wet)/i.test(lower)) slip.floor_condition = "Dry"
      else if (/(floor).*(wet|slippery)/i.test(lower)) slip.floor_condition = "Wet/slippery"
      else if (/(uneven|clutter|cords?)/i.test(lower)) slip.floor_condition = "Uneven/cluttered"
    }

    if (slip.obstructions_in_path === null) {
      if (/(free of (?:clutter|cords)|no clutter|no cords)/i.test(lower)) slip.obstructions_in_path = false
      else if (/(clutter|cords?).*(present|in path|on floor)/i.test(lower)) slip.obstructions_in_path = true
    }

    if (slip.lighting_level === null) {
      if (/(dimly lit|dim light|low light)/i.test(lower)) slip.lighting_level = "Dim"
      else if (/(well[-\s]?lit|bright)/i.test(lower)) slip.lighting_level = "Well-lit"
    }
  }

  return state
}


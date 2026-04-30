// @vitest-environment node
import { describe, expect, it } from "vitest"

import { analyzeNarrativeAndScore } from "@/lib/agents/expert_investigator/analyze"

describe("analyzer extraction normalizer", () => {
  it("fills high-signal booleans and bed subtype cues from narrative", async () => {
    const narrative = [
      "At approximately 02:15 AM during routine room rounds, I found the resident lying on the floor on the right side of his bed.",
      "The fall was unwitnessed.",
      "He was conscious and alert, but appeared mildly disoriented.",
      "There was no visible bleeding, lacerations, or immediate signs of head trauma.",
      "The room was dimly lit with only the bathroom nightlight turned on.",
      "The linoleum floor was completely dry and free of any clutter or cords.",
      "His rolling walker was present in the room, but it was positioned about four feet away near the closet, out of his immediate reach from the bed.",
      "The bed itself was locked in the lowest position, but the bedside fall mat had not been deployed.",
    ].join(" ")

    const result = await analyzeNarrativeAndScore(narrative)
    expect(result.state.global_standards.fall_witnessed).toBe(false)
    expect(result.state.global_standards.head_impact_suspected).toBe(false)
    expect(result.state.global_standards.assistive_device_in_use).toBe("Not in use; walker out of reach")

    // Subtype inference + subtype field fill (conservative).
    expect(result.state.sub_type).toBe("fall-bed")
    expect(result.state.sub_type_data?.sub_type_id).toBe("fall-bed")

    if (result.state.sub_type_data?.sub_type_id === "fall-bed") {
      expect(result.state.sub_type_data.floor_mat_present).toBe(false)
      expect(result.state.sub_type_data.bed_height).toBe("Lowest position")
      expect(result.state.sub_type_data.assistive_device_nearby).toBe(false)
      expect(result.state.sub_type_data.resident_position).toBe("right side of bed")
    }
  })

  it("fills assistive_device_in_use only when usage is explicit", async () => {
    const narrative = "Resident was ambulating with a walker when they lost balance and fell in the hallway."
    const result = await analyzeNarrativeAndScore(narrative)
    expect(result.state.global_standards.assistive_device_in_use).toBe("Walker")
  })
})


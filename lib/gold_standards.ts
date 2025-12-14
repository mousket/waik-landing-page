export interface GoldStandardFallReport {
  // 1. Incident Basics
  resident_name: string
  room_number: string
  date_of_fall: string
  time_of_fall: string
  location_of_fall: string

  // 2. The Narrative
  fall_witnessed: boolean | null
  staff_narrative: string
  resident_statement: string

  // 3. Resident State (At Time of Fall)
  activity_at_time: string
  footwear: string
  clothing_issue: boolean | null
  reported_symptoms_pre_fall: string

  // 4. Post-Fall Actions (The 72-Hour Chain)
  immediate_injuries_observed: string
  head_impact_suspected: boolean | null
  vitals_taken_post_fall: boolean | null
  neuro_checks_initiated: boolean | null
  physician_notified: boolean | null
  family_notified: boolean | null
  immediate_intervention_in_place: string

  // 5. Environmental & Care Plan State
  assistive_device_in_use: string
  call_light_in_reach: boolean | null
  was_care_plan_followed: boolean | null
}

export interface FallBedStandards {
  sub_type_id: "fall-bed"
  resident_position: string | null
  bed_height: string | null
  bed_rails_status: string | null
  floor_mat_present: boolean | null
  bolstered_mattress: boolean | null
  obstructions_at_bedside: boolean | null
  bed_sheets_on_bed: boolean | null
  assistive_device_nearby: boolean | null
}

export interface FallWheelchairStandards {
  sub_type_id: "fall-wheelchair"
  brakes_locked: boolean | null
  anti_rollback_device: boolean | null
  cushion_in_place: boolean | null
  anti_slip_device_on_seat: boolean | null
  footrests_position: string | null
  armrests_present: boolean | null
  chair_tipped_over: boolean | null
  chair_rolled_or_turned: boolean | null
  resident_position: string | null
}

export interface FallSlipStandards {
  sub_type_id: "fall-slip"
  floor_condition: string | null
  spill_source: string | null
  lighting_level: string | null
  obstructions_in_path: boolean | null
}

export interface FallLiftStandards {
  sub_type_id: "fall-lift"
  lift_type: string | null
  staff_assisting_count: number | null
  policy_requires_two_staff: boolean | null
  was_policy_followed: boolean | null
  sling_type_and_size: string | null
  sling_condition: string | null
  sling_attached_correctly: boolean | null
  resident_cooperation: string | null
  phase_of_transfer: string | null
  failure_point: string | null
  equipment_removed_from_service: boolean | null
}

export type FallSubtypeStandards =
  | FallBedStandards
  | FallWheelchairStandards
  | FallSlipStandards
  | FallLiftStandards

export interface AgentState {
  global_standards: GoldStandardFallReport
  sub_type: FallSubtypeStandards["sub_type_id"] | null
  sub_type_data: FallSubtypeStandards | null
  score?: number | null
  completenessScore?: number | null
  feedback?: string | null
  filledFields?: string[]
  missingFields?: string[]
}

/**
 * Field schemas for conversational activity and dietary assessments (task-07).
 */

export type ActivityParticipationLevel = "high" | "moderate" | "low" | "declined"
export type MobilityLevel = "independent" | "supervised" | "assisted" | "dependent"
export type AppetiteLevel = "good" | "fair" | "poor"
export type TextureRequirement = "regular" | "soft" | "minced" | "pureed" | "liquid"
export type FluidIntakeLevel = "adequate" | "borderline" | "inadequate"

export interface ActivityAssessmentStandards {
  preferred_activities: string
  activity_participation_level: ActivityParticipationLevel | null
  mobility_level: MobilityLevel | null
  social_preferences: string
  barriers_to_participation: string
  recent_engagement_changes: string
  staff_observations: string
  resident_stated_preferences: string
}

export interface DietaryAssessmentStandards {
  appetite_level: AppetiteLevel | null
  food_preferences: string
  food_aversions: string
  texture_requirements: TextureRequirement | null
  fluid_intake_level: FluidIntakeLevel | null
  recent_weight_changes: string
  meal_assistance_needed: boolean | null
  cultural_dietary_needs: string
  reported_GI_issues: string
  staff_observations: string
}

export type AssessmentStructuredOutput = ActivityAssessmentStandards | DietaryAssessmentStandards

const ACTIVITY_KEYS: (keyof ActivityAssessmentStandards)[] = [
  "preferred_activities",
  "activity_participation_level",
  "mobility_level",
  "social_preferences",
  "barriers_to_participation",
  "recent_engagement_changes",
  "staff_observations",
  "resident_stated_preferences",
]

const DIETARY_KEYS: (keyof DietaryAssessmentStandards)[] = [
  "appetite_level",
  "food_preferences",
  "food_aversions",
  "texture_requirements",
  "fluid_intake_level",
  "recent_weight_changes",
  "meal_assistance_needed",
  "cultural_dietary_needs",
  "reported_GI_issues",
  "staff_observations",
]

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0
}

function isPopulatedValue(key: string, v: unknown): boolean {
  if (v == null) return false
  if (typeof v === "boolean") return true
  if (typeof v === "string") return isNonEmptyString(v)
  return false
}

/** Simple completeness: fraction of schema fields with useful values (0–100). */
export function scoreCompleteness(
  assessmentType: "activity" | "dietary",
  structured: Partial<ActivityAssessmentStandards> & Partial<DietaryAssessmentStandards>,
): number {
  const keys = assessmentType === "activity" ? ACTIVITY_KEYS : DIETARY_KEYS
  let filled = 0
  for (const k of keys) {
    if (isPopulatedValue(k, structured[k as keyof typeof structured])) {
      filled += 1
    }
  }
  return Math.min(100, Math.round((filled / keys.length) * 100))
}

export function openingQuestionText(assessmentType: "activity" | "dietary", residentName: string): string {
  const n = residentName.trim() || "this resident"
  if (assessmentType === "activity") {
    return `Tell me about ${n}'s engagement with activities lately. What do they seem to enjoy?`
  }
  return `How has ${n} been eating lately? Walk me through their appetite and any preferences.`
}

export const ASSESSMENT_OPENING_QUESTION_ID = "q-opening"

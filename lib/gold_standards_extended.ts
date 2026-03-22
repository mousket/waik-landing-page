/**
 * Extended Gold Standards for Multiple Incident Types
 * 
 * This file contains gold standard schemas for all incident categories.
 * Falls are fully implemented; others are placeholders for future development.
 */

// Re-export existing fall standards
export * from "./gold_standards"

// ============================================================================
// INCIDENT CATEGORY DETECTION
// ============================================================================

export type IncidentCategory = "fall" | "medication" | "dietary" | "behavioral" | "other"

export interface IncidentCategoryResult {
  category: IncidentCategory
  confidence: number // 0-1
  reasoning: string
  suggestedSubtype?: string
}

// Keywords and patterns for category detection
export const CATEGORY_DETECTION_PATTERNS: Record<IncidentCategory, string[]> = {
  fall: [
    "fall", "fell", "fallen", "slipped", "tripped", "stumbled", "collapsed",
    "found on floor", "on the ground", "lost balance", "tumbled", "dropped",
    "bed fall", "wheelchair fall", "transfer fall"
  ],
  medication: [
    "medication", "medicine", "drug", "dose", "dosage", "pill", "tablet",
    "wrong medication", "missed dose", "late medication", "adverse reaction",
    "side effect", "allergic reaction", "overdose", "underdose", "pharmacy",
    "prescription", "administered", "injection", "IV"
  ],
  dietary: [
    "dietary", "food", "meal", "eating", "swallowing", "choking", "aspiration",
    "allergy", "allergic", "lactose", "gluten", "diabetic diet", "renal diet",
    "texture", "pureed", "thickened liquids", "NPO", "feeding", "nutrition"
  ],
  behavioral: [
    "aggressive", "agitated", "wandering", "elopement", "combative", "verbal abuse",
    "physical abuse", "self-harm", "suicidal", "refused care", "non-compliant",
    "exit seeking", "altercation", "threatening", "confusion", "delirium"
  ],
  other: []
}

// ============================================================================
// MEDICATION INCIDENT GOLD STANDARD (Placeholder)
// ============================================================================

export interface GoldStandardMedicationReport {
  // Incident Basics
  resident_name: string
  room_number: string
  date_of_incident: string
  time_of_incident: string
  
  // Medication Details
  medication_name: string
  medication_dose: string
  route_of_administration: string
  scheduled_time: string
  actual_time: string
  
  // Error Classification
  error_type: "wrong_medication" | "wrong_dose" | "wrong_time" | "wrong_route" | "wrong_patient" | "omission" | "adverse_reaction" | null
  
  // Contributing Factors
  staff_narrative: string
  was_order_verified: boolean | null
  was_patient_identified: boolean | null
  was_allergies_checked: boolean | null
  
  // Outcome
  patient_outcome: string
  physician_notified: boolean | null
  pharmacy_notified: boolean | null
  family_notified: boolean | null
  intervention_required: string
}

export const DEFAULT_MEDICATION_STATE: GoldStandardMedicationReport = {
  resident_name: "",
  room_number: "",
  date_of_incident: "",
  time_of_incident: "",
  medication_name: "",
  medication_dose: "",
  route_of_administration: "",
  scheduled_time: "",
  actual_time: "",
  error_type: null,
  staff_narrative: "",
  was_order_verified: null,
  was_patient_identified: null,
  was_allergies_checked: null,
  patient_outcome: "",
  physician_notified: null,
  pharmacy_notified: null,
  family_notified: null,
  intervention_required: ""
}

// ============================================================================
// DIETARY INCIDENT GOLD STANDARD (Placeholder)
// ============================================================================

export interface GoldStandardDietaryReport {
  // Incident Basics
  resident_name: string
  room_number: string
  date_of_incident: string
  time_of_incident: string
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null
  
  // Dietary Details
  prescribed_diet: string
  food_served: string
  dietary_restriction_violated: string
  
  // Error Classification
  error_type: "wrong_diet" | "allergen_exposure" | "texture_violation" | "choking" | "aspiration" | null
  
  // Contributing Factors
  staff_narrative: string
  diet_card_checked: boolean | null
  kitchen_notified: boolean | null
  
  // Outcome
  patient_symptoms: string
  physician_notified: boolean | null
  family_notified: boolean | null
  intervention_required: string
}

export const DEFAULT_DIETARY_STATE: GoldStandardDietaryReport = {
  resident_name: "",
  room_number: "",
  date_of_incident: "",
  time_of_incident: "",
  meal_type: null,
  prescribed_diet: "",
  food_served: "",
  dietary_restriction_violated: "",
  error_type: null,
  staff_narrative: "",
  diet_card_checked: null,
  kitchen_notified: null,
  patient_symptoms: "",
  physician_notified: null,
  family_notified: null,
  intervention_required: ""
}

// ============================================================================
// BEHAVIORAL INCIDENT GOLD STANDARD (Placeholder)
// ============================================================================

export interface GoldStandardBehavioralReport {
  // Incident Basics
  resident_name: string
  room_number: string
  date_of_incident: string
  time_of_incident: string
  location_of_incident: string
  
  // Behavioral Details
  behavior_type: "aggression" | "wandering" | "elopement" | "self_harm" | "refusal_of_care" | "verbal_abuse" | null
  behavior_description: string
  trigger_identified: string
  
  // People Involved
  witnesses: string
  other_residents_affected: boolean | null
  staff_involved: string
  
  // Interventions
  staff_narrative: string
  de_escalation_attempted: boolean | null
  de_escalation_techniques_used: string
  restraint_used: boolean | null
  prn_medication_given: boolean | null
  
  // Outcome
  resident_outcome: string
  physician_notified: boolean | null
  family_notified: boolean | null
  police_called: boolean | null
  injury_to_staff_or_others: string
}

export const DEFAULT_BEHAVIORAL_STATE: GoldStandardBehavioralReport = {
  resident_name: "",
  room_number: "",
  date_of_incident: "",
  time_of_incident: "",
  location_of_incident: "",
  behavior_type: null,
  behavior_description: "",
  trigger_identified: "",
  witnesses: "",
  other_residents_affected: null,
  staff_involved: "",
  staff_narrative: "",
  de_escalation_attempted: null,
  de_escalation_techniques_used: "",
  restraint_used: null,
  prn_medication_given: null,
  resident_outcome: "",
  physician_notified: null,
  family_notified: null,
  police_called: null,
  injury_to_staff_or_others: ""
}

// ============================================================================
// FINAL CRITICAL QUESTIONS (Always Required - Phase 1 Closing)
// These 8 questions are ALWAYS asked at the end of Phase 1, after all
// gap analysis questions have been answered.
// ============================================================================

export const FINAL_CRITICAL_QUESTIONS = [
  {
    id: "incident-description",
    questionText: "Please describe in detail what happened during the incident.",
    goldStandardField: "incident_description",
    order: 1,
  },
  {
    id: "root-cause",
    questionText: "What is the root cause of this incident?",
    goldStandardField: "root_cause",
    order: 2,
  },
  {
    id: "contributing-factors",
    questionText: "What are the contributing factors?",
    goldStandardField: "contributing_factors",
    order: 3,
  },
  {
    id: "present-state",
    questionText: "What is the present state of the resident?",
    goldStandardField: "resident_present_state",
    order: 4,
  },
  {
    id: "immediate-interventions",
    questionText: "Describe what interventions were taken immediately after the incident.",
    goldStandardField: "immediate_interventions",
    order: 5,
  },
  {
    id: "resident-factors",
    questionText: "Is there anything about the resident's physical health, personality, or mental state that may have contributed to this incident?",
    goldStandardField: "resident_contributing_factors",
    order: 6,
  },
  {
    id: "prevention-recommendations",
    questionText: "What would you recommend as measures to prevent this type of incident from recurring?",
    goldStandardField: "prevention_recommendations",
    order: 7,
  },
  {
    id: "ideal-intervention",
    questionText: "What do you think should be the ideal intervention for this type of incident or for this specific situation?",
    goldStandardField: "ideal_intervention",
    order: 8,
  },
] as const

export type FinalCriticalQuestionId = typeof FINAL_CRITICAL_QUESTIONS[number]["id"]

// ============================================================================
// UNIFIED AGENT STATE (Supports All Incident Types)
// ============================================================================

export interface UnifiedAgentState {
  // Category detection
  category: IncidentCategory
  categoryConfidence: number
  
  // Type-specific state (only one will be populated)
  fallState?: import("./gold_standards").AgentState
  medicationState?: GoldStandardMedicationReport
  dietaryState?: GoldStandardDietaryReport
  behavioralState?: GoldStandardBehavioralReport
  
  // Universal tracking
  completenessScore: number
  filledFields: string[]
  missingFields: string[]
  
  // Final critical questions state (8 Phase 1 closing questions)
  finalCriticalAnswers: {
    incident_description?: string
    root_cause?: string
    contributing_factors?: string
    resident_present_state?: string
    immediate_interventions?: string
    resident_contributing_factors?: string
    prevention_recommendations?: string
    ideal_intervention?: string
  }
}


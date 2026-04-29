/**
 * Tier 1 + Closing question configuration for the incident reporting rebuild.
 *
 * These are fixed, human-authored questions (not AI-generated). Tier 1 is asked
 * at the start of every incident report; closing questions appear once the AI
 * gap-fill threshold is reached. Sourced from clinical expertise (Scott
 * Kallstrom). See documentation/pilot_1_plan/incident_report/WAiK_Incident_Reporting_Blueprint.md §4.
 */

export interface Tier1Question {
  id: string
  text: string
  label: string
  areaHint: string
  tier: "tier1" | "closing"
  allowDefer: boolean
  required: boolean
}

export const FALL_TIER1_QUESTIONS: Tier1Question[] = [
  {
    id: "t1-q1",
    text: "Tell us everything that happened — describe the fall in as much detail as you have.",
    label: "Q1",
    areaHint: "Narrative",
    tier: "tier1",
    allowDefer: false,
    required: true,
  },
  {
    id: "t1-q2",
    text: "What did the resident say happened?",
    label: "Q2",
    areaHint: "Resident Statement",
    tier: "tier1",
    allowDefer: false,
    required: true,
  },
  {
    id: "t1-q3",
    text: "What were your intervention steps — what did you do to help?",
    label: "Q3",
    areaHint: "Interventions",
    tier: "tier1",
    allowDefer: false,
    required: true,
  },
  {
    id: "t1-q4",
    text: "Tell us about the environment — the room, lighting, floor conditions, and any equipment nearby.",
    label: "Q4",
    areaHint: "Environment",
    tier: "tier1",
    allowDefer: false,
    required: true,
  },
  {
    id: "t1-q5",
    text: "Why do you think the incident occurred, and how could it have been prevented?",
    label: "Q5",
    areaHint: "Root Cause",
    tier: "tier1",
    allowDefer: false,
    required: true,
  },
]

export const CLOSING_QUESTIONS: Tier1Question[] = [
  {
    id: "c-q1",
    text: "What immediate interventions did you put in place for this resident?",
    label: "Closing 1",
    areaHint: "Interventions",
    tier: "closing",
    allowDefer: false,
    required: true,
  },
  {
    id: "c-q2",
    text: "What do you think are the contributing factors or root cause?",
    label: "Closing 2",
    areaHint: "Root Cause",
    tier: "closing",
    allowDefer: false,
    required: true,
  },
  {
    id: "c-q3",
    text: "What do you recommend should be done to prevent this from happening again?",
    label: "Closing 3",
    areaHint: "Recommendations",
    tier: "closing",
    allowDefer: false,
    required: true,
  },
]

/**
 * Maps incident types to their fixed Tier 1 questions. Pilot supports falls
 * only; future incident types (medication errors, conflicts, wounds, abuse)
 * are intentionally deferred per the blueprint scope.
 */
export const TIER1_BY_TYPE: Record<string, Tier1Question[]> = {
  fall: FALL_TIER1_QUESTIONS,
}

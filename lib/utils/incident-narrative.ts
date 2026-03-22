import type { Incident } from "@/lib/types"

const NEWLINE = "\n"

/**
 * Builds narrative sections from INITIAL REPORT ONLY (no Q&A)
 * Used for static Report Card calculation
 */
export function buildInitialNarrativeSections(incident: Incident): string[] {
  const sections: string[] = []

  const initial = incident.initialReport
  if (initial?.narrative) {
    sections.push(initial.narrative.trim())
  }
  if (initial?.residentState) {
    sections.push(`Resident State:${NEWLINE}${initial.residentState.trim()}`)
  }
  if (initial?.environmentNotes) {
    sections.push(`Environment Notes:${NEWLINE}${initial.environmentNotes.trim()}`)
  }

  return sections.filter((section) => section.length > 0)
}

/**
 * Builds the initial narrative only (no Q&A)
 * Used for static Report Card - reflects what frontline staff reported
 */
export function buildInitialNarrative(incident: Incident): string {
  return buildInitialNarrativeSections(incident).join(`${NEWLINE}${NEWLINE}`).trim()
}

/**
 * Builds narrative sections including Q&A answers
 * Used for dynamic Documentation Score calculation
 */
export function buildIncidentNarrativeSections(incident: Incident): string[] {
  const sections: string[] = []

  const initial = incident.initialReport
  if (initial?.narrative) {
    sections.push(initial.narrative.trim())
  }
  if (initial?.residentState) {
    sections.push(`Resident State:${NEWLINE}${initial.residentState.trim()}`)
  }
  if (initial?.environmentNotes) {
    sections.push(`Environment Notes:${NEWLINE}${initial.environmentNotes.trim()}`)
  }

  if (incident.questions?.length) {
    incident.questions.forEach((question) => {
      const answerText = question.answer?.answerText?.trim()
      if (answerText) {
        sections.push(`Question: ${question.questionText.trim()}${NEWLINE}Answer: ${answerText}`)
      }
    })
  }

  return sections.filter((section) => section.length > 0)
}

/**
 * Builds combined narrative including Q&A answers
 * Used for dynamic Documentation Score - improves over time
 */
export function buildIncidentCombinedNarrative(incident: Incident): string {
  return buildIncidentNarrativeSections(incident).join(`${NEWLINE}${NEWLINE}`).trim()
}

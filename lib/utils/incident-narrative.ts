import type { Incident } from "@/lib/types"

const NEWLINE = "\n"

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

export function buildIncidentCombinedNarrative(incident: Incident): string {
  return buildIncidentNarrativeSections(incident).join(`${NEWLINE}${NEWLINE}`).trim()
}

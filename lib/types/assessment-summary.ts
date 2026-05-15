export type AssessmentSummary = {
  id: string
  residentId: string
  residentName: string
  residentRoom: string
  assessmentType: string
  status: string
  conductedAt: string | null
  nextDueAt: string | null
  conductedByName: string
  completenessScore: number
  supportedForStaff: boolean
}

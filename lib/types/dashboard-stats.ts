/** GET /api/admin/dashboard-stats — aggregation + Redis cache (task-06e). */

export interface DashboardStats {
  totalIncidents30d: number
  avgCompleteness30d: number
  avgDaysToClose30d: number
  injuryFlagPercent30d: number
  totalIncidentsPrev30d: number
  avgCompletenessPrev30d: number
  avgDaysToClosePrev30d: number
  upcomingAssessments7d: number
  /** Up to 5 rows for sidebar list (same query window as count). */
  upcomingAssessmentItems: { residentRoom: string; assessmentType: string; nextDueAt: string }[]
  generatedAt: string
}

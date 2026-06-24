import type { IncidentSummary } from "@/lib/types/incident-summary"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

/** Maps facility-wide admin list rows to pill card shape (pending counts not loaded on admin API). */
export function mapIncidentSummaryToStaffPill(inc: IncidentSummary): StaffIncidentSummary {
  return {
    id: inc.id,
    facilityId: inc.facilityId,
    residentName: inc.residentName,
    residentRoom: inc.residentRoom,
    incidentType: inc.incidentType,
    hasInjury: inc.hasInjury,
    phase: inc.phase,
    staffId: inc.staffId,
    reporterName: inc.reportedByName,
    startedAt: inc.startedAt,
    phase1SignedAt: inc.phase1SignedAt,
    completenessScore: inc.completenessScore,
    completenessAtSignoff: inc.completenessAtSignoff,
    tier2QuestionsGenerated: 0,
    questionsAnswered: 0,
    questionsDeferred: 0,
    pendingQuestionCount: 0,
    pendingTier1Count: 0,
    pendingTier2Count: 0,
    pendingTier2UnansweredCount: 0,
    pendingTier2DeferredCount: 0,
    pendingClosingCount: 0,
    tier2Generated: false,
    isOwnReport: false,
    hasAssignedTask: false,
  }
}

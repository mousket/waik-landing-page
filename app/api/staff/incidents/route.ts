import { NextResponse } from "next/server"
import IncidentModel from "@/backend/src/models/incident.model"
import { withAuth } from "@/lib/api-handler"
import { sameIdsForOrMatch, staffIdMatch } from "@/lib/staff-identity"
import {
  countPendingQuestionsForStaff,
  countReporterPendingBreakdown,
  hasStaffIdtAssignment,
  isIncidentReporter,
} from "@/lib/staff-incident-access"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

type RawIncident = {
  id?: string
  facilityId?: string
  residentRoom?: string
  residentName?: string
  incidentType?: string
  hasInjury?: boolean
  phase?: StaffIncidentSummary["phase"]
  staffId?: string
  staffName?: string
  createdAt?: Date | string
  completenessScore?: number
  completenessAtSignoff?: number
  tier2QuestionsGenerated?: number
  questionsAnswered?: number
  questionsDeferred?: number
  phaseTransitionTimestamps?: {
    phase1Started?: Date | string
    phase1Signed?: Date | string
  }
  idtTeam?: Array<{ userId?: string; status?: string }>
  questions?: Array<{
    answer?: unknown
    assignedTo?: string[]
    metadata?: { idt?: boolean }
    generatedBy?: string
    priority?: { phase?: string }
  }>
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function mapRawToSummary(
  incident: RawIncident,
  currentUser: Parameters<typeof isIncidentReporter>[1],
): StaffIncidentSummary {
  const phase = (incident.phase ?? "phase_1_in_progress") as StaffIncidentSummary["phase"]
  const startedAt =
    toIsoString(incident.phaseTransitionTimestamps?.phase1Started) ??
    toIsoString(incident.createdAt) ??
    new Date().toISOString()
  const own = isIncidentReporter(incident, currentUser)
  const assigned = hasStaffIdtAssignment(incident, currentUser)
  const reporterPending = countReporterPendingBreakdown(incident, currentUser, phase)

  return {
    id: String(incident.id ?? ""),
    facilityId: String(incident.facilityId ?? currentUser.facilityId ?? ""),
    residentName: String(incident.residentName ?? "").trim() || "Resident",
    residentRoom: String(incident.residentRoom ?? ""),
    incidentType: String(incident.incidentType ?? ""),
    hasInjury: Boolean(incident.hasInjury),
    phase,
    staffId: String(incident.staffId ?? ""),
    reporterName: String(incident.staffName ?? "").trim() || "Staff",
    startedAt,
    phase1SignedAt: toIsoString(incident.phaseTransitionTimestamps?.phase1Signed),
    completenessScore: Number(incident.completenessScore ?? 0),
    completenessAtSignoff: Number(incident.completenessAtSignoff ?? 0),
    tier2QuestionsGenerated: Number(incident.tier2QuestionsGenerated ?? 0),
    questionsAnswered: Number(incident.questionsAnswered ?? 0),
    questionsDeferred: Number(incident.questionsDeferred ?? 0),
    pendingQuestionCount: countPendingQuestionsForStaff(incident, currentUser, phase),
    pendingTier1Count: reporterPending.tier1,
    pendingTier2Count: reporterPending.tier2,
    pendingTier2UnansweredCount: reporterPending.tier2Unanswered,
    pendingTier2DeferredCount: reporterPending.tier2Deferred,
    pendingClosingCount: reporterPending.closing,
    tier2Generated: reporterPending.tier2Generated,
    isOwnReport: own,
    hasAssignedTask: assigned,
  }
}

function sortNewestFirst(rows: StaffIncidentSummary[]) {
  rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export const GET = withAuth(async (request, { currentUser }) => {
  const url = new URL(request.url)
  const unit = url.searchParams.get("unit")
  const userIds = sameIdsForOrMatch(currentUser)

  const accessOr: Record<string, unknown>[] = [staffIdMatch(currentUser)]

  if (userIds.length > 0) {
    accessOr.push(
      { idtTeam: { $elemMatch: { userId: { $in: userIds }, status: "pending" } } },
      {
        questions: {
          $elemMatch: {
            "metadata.idt": true,
            assignedTo: { $in: userIds },
            answer: { $exists: false },
          },
        },
      },
    )
  }

  const query: Record<string, unknown> = {
    facilityId: currentUser.facilityId,
    $or: accessOr,
  }

  if (unit) {
    // TODO(task-05a): Filter by unit when incident stores unit/wing.
  }

  const raw = (await IncidentModel.find(query)
    .sort({ "phaseTransitionTimestamps.phase1Started": -1, createdAt: -1 })
    .select(
      [
        "id",
        "facilityId",
        "residentRoom",
        "residentName",
        "incidentType",
        "hasInjury",
        "phase",
        "staffId",
        "staffName",
        "createdAt",
        "completenessScore",
        "completenessAtSignoff",
        "tier2QuestionsGenerated",
        "questionsAnswered",
        "questionsDeferred",
        "phaseTransitionTimestamps.phase1Started",
        "phaseTransitionTimestamps.phase1Signed",
        "idtTeam",
        "questions.answer",
        "questions.assignedTo",
        "questions.metadata",
        "questions.generatedBy",
        "questions.priority",
      ].join(" "),
    )
    .lean()
    .exec()) as RawIncident[]

  const all: StaffIncidentSummary[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    const summary = mapRawToSummary(row, currentUser)
    if (!summary.id || !summary.facilityId || seen.has(summary.id)) continue
    seen.add(summary.id)
    all.push(summary)
  }

  const myHistory = all.filter((i) => i.isOwnReport)
  const assignedToMe = all.filter((i) => i.hasAssignedTask && !i.isOwnReport)
  const active = all.filter(
    (i) => i.phase !== "closed" && (i.isOwnReport || i.hasAssignedTask),
  )

  sortNewestFirst(myHistory)
  sortNewestFirst(assignedToMe)
  sortNewestFirst(active)

  return NextResponse.json({
    incidents: myHistory,
    active,
    myHistory,
    assignedToMe,
    total: myHistory.length,
  })
})

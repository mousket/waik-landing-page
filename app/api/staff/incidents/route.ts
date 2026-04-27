import { NextResponse } from "next/server"
import IncidentModel from "@/backend/src/models/incident.model"
import { withAuth } from "@/lib/api-handler"
import { staffIdMatch } from "@/lib/staff-identity"
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
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export const GET = withAuth(async (request, { currentUser }) => {
  const url = new URL(request.url)
  const unit = url.searchParams.get("unit")

  const query: Record<string, unknown> = {
    facilityId: currentUser.facilityId,
    ...staffIdMatch(currentUser),
  }

  // Unit filtering requires a unit/wing field on the incident; currently we only have room.
  // Keep this param for forward compatibility with the staff dashboard contract.
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
        "createdAt",
        "completenessScore",
        "completenessAtSignoff",
        "tier2QuestionsGenerated",
        "questionsAnswered",
        "questionsDeferred",
        "phaseTransitionTimestamps.phase1Started",
        "phaseTransitionTimestamps.phase1Signed",
      ].join(" "),
    )
    .lean()
    .exec()) as RawIncident[]

  const incidents: StaffIncidentSummary[] = raw
    .map((incident) => {
      const startedAt =
        toIsoString(incident.phaseTransitionTimestamps?.phase1Started) ??
        toIsoString(incident.createdAt) ??
        new Date().toISOString()

      return {
        id: String(incident.id ?? ""),
        facilityId: String(incident.facilityId ?? currentUser.facilityId ?? ""),
        residentName: String(incident.residentName ?? "").trim() || "Resident",
        residentRoom: String(incident.residentRoom ?? ""),
        incidentType: String(incident.incidentType ?? ""),
        hasInjury: Boolean(incident.hasInjury),
        phase: (incident.phase ?? "phase_1_in_progress") as StaffIncidentSummary["phase"],
        staffId: String(incident.staffId ?? currentUser.userId ?? ""),
        startedAt,
        phase1SignedAt: toIsoString(incident.phaseTransitionTimestamps?.phase1Signed),
        completenessScore: Number(incident.completenessScore ?? 0),
        completenessAtSignoff: Number(incident.completenessAtSignoff ?? 0),
        tier2QuestionsGenerated: Number(incident.tier2QuestionsGenerated ?? 0),
        questionsAnswered: Number(incident.questionsAnswered ?? 0),
        questionsDeferred: Number(incident.questionsDeferred ?? 0),
      }
    })
    .filter((i) => i.id && i.facilityId && i.staffId)

  return NextResponse.json({ incidents, total: incidents.length })
})
